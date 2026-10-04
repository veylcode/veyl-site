import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { z } from "zod";
import { openDatabase } from "./database.ts";
import { digest, hashPassword, newToken, verifyPassword } from "./auth.ts";
import { createEvents } from "./events.ts";
import { resolveStatus } from "./status.ts";
import {
  siteSchema,
  messageSchema,
  visitorSchema,
  conversationSchema,
} from "./schemas.ts";
import type { SiteData } from "../src/types.ts";

interface Session {
  hash: string;
  kind: string;
  subject: string;
  expires: number;
}
interface Options {
  databasePath: string;
  passwordHash: string;
  origin: string;
  production?: boolean;
  staticRoot?: string;
  uploadRoot?: string;
}
export async function buildApp(options: Options) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(options.passwordHash))
    throw new Error("Valid ADMIN_PASSWORD_HASH is required");
  const app = Fastify({
    logger: false,
    bodyLimit: 2_000_000,
    trustProxy: options.production ? "127.0.0.1" : false,
  });
  const data = openDatabase(options.databasePath);
  data.db
    .prepare("INSERT OR IGNORE INTO credentials(id,hash) VALUES(1,?)")
    .run(options.passwordHash);
  const currentHash = () =>
    String(
      data.db.prepare("SELECT hash FROM credentials WHERE id=1").get()!.hash,
    );
  const events = createEvents();
  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: options.production ? [] : null,
      },
    },
  });
  await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/api/"))
      reply.header("Cache-Control", "no-store");
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      request.headers.origin !== options.origin
    ) {
      return reply.code(403).send({
        message: "Недопустимый источник запроса / Invalid request origin",
      });
    }
  });
  app.setErrorHandler(
    (error: Error & { statusCode?: number }, _request, reply) => {
      if (error instanceof z.ZodError)
        return reply.code(400).send({
          message: "Проверь заполненные поля / Check the form fields",
          details: error.issues.map((issue) => issue.path.join(".")),
        });
      if (error.statusCode && error.statusCode < 500)
        return reply.code(error.statusCode).send({ message: error.message });
      console.error("API error:", error.message);
      return reply.code(500).send({ message: "Ошибка сервера / Server error" });
    },
  );
  function session(
    request: FastifyRequest,
    kind: "admin" | "visitor",
  ): Session | undefined {
    const token =
      request.cookies[kind === "admin" ? "veyl_admin" : "veyl_visitor"];
    if (!token) return;
    const row = data.db
      .prepare("SELECT * FROM sessions WHERE hash=? AND kind=? AND expires>?")
      .get(digest(token), kind, Date.now()) as unknown as Session | undefined;
    return row;
  }
  async function admin(request: FastifyRequest, reply: FastifyReply) {
    if (!session(request, "admin"))
      return reply
        .code(401)
        .send({ message: "Нужно войти в панель / Sign in required" });
  }
  async function visitor(request: FastifyRequest, reply: FastifyReply) {
    if (!session(request, "visitor"))
      return reply
        .code(401)
        .send({ message: "Чат ещё не открыт / Chat session required" });
  }
  function issueSession(
    reply: FastifyReply,
    kind: "admin" | "visitor",
    subject: string,
  ) {
    const token = newToken(),
      expires = Date.now() + (kind === "admin" ? 8 * 3600000 : 90 * 86400000);
    data.db
      .prepare(
        "INSERT INTO sessions(hash,kind,subject,expires) VALUES(?,?,?,?)",
      )
      .run(digest(token), kind, subject, expires);
    reply.setCookie(kind === "admin" ? "veyl_admin" : "veyl_visitor", token, {
      path: "/",
      httpOnly: true,
      secure: !!options.production,
      sameSite: kind === "admin" ? "strict" : "lax",
      maxAge: Math.floor((expires - Date.now()) / 1000),
    });
  }
  function effectiveSite() {
    let { site, revision } = data.getSite();
    const resolved = resolveStatus(site);
    if (resolved.expired) {
      site = { ...site, status: site.statusFallback, statusUntil: null };
      revision = data.saveSite(site, revision) ?? revision;
      events.notify("site");
    }
    return { site, revision, effectiveStatus: resolveStatus(site).status };
  }
  function chatAllowed(request: FastifyRequest) {
    const { site, effectiveStatus } = effectiveSite();
    const active = site.statusDefinitions.find(
      (status) => status.id === effectiveStatus,
    );
    if (!site.settings.chatVisible || !active?.chatEnabled) return false;
    const id = session(request, "visitor")?.subject;
    const chat = id
      ? data.db.prepare("SELECT state FROM conversations WHERE id=?").get(id)
      : undefined;
    return chat?.state !== "blocked" && chat?.state !== "closed";
  }
  app.get("/api/health", async () => ({ ok: true }));
  app.get("/api/public/site", async () => {
    const { site, revision, effectiveStatus } = effectiveSite();
    const {
      schedules: _schedules,
      quickReplies: _quickReplies,
      ...publicData
    } = site;
    return {
      ...publicData,
      status: effectiveStatus,
      projects: site.projects.filter(
        (project) =>
          project.visible &&
          !["draft", "private"].includes(project.state ?? "active"),
      ),
      cases: site.cases.filter((item) => item.visible),
      workload: {
        projectNames: site.workload.showNames ? site.workload.projectNames : [],
        showNames: site.workload.showNames,
        count: site.workload.projectNames.length,
      },
      revision,
    };
  });
  app.post(
    "/api/admin/login",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const { password } = z
        .object({ password: z.string().min(1).max(256) })
        .parse(request.body);
      if (!(await verifyPassword(password, currentHash())))
        return reply
          .code(401)
          .send({ message: "Неверный пароль / Incorrect password" });
      const previous = request.cookies.veyl_admin;
      if (previous) {
        data.db
          .prepare("DELETE FROM sessions WHERE hash=? AND kind=?")
          .run(digest(previous), "admin");
        events.revoke(digest(previous));
      }
      issueSession(reply, "admin", "owner");
      data.audit("login");
      return { ok: true };
    },
  );
  app.post(
    "/api/admin/logout",
    { preHandler: admin },
    async (request, reply) => {
      data.db
        .prepare("DELETE FROM sessions WHERE hash=?")
        .run(digest(request.cookies.veyl_admin!));
      events.revoke(digest(request.cookies.veyl_admin!));
      reply.clearCookie("veyl_admin", {
        path: "/",
        httpOnly: true,
        secure: !!options.production,
        sameSite: "strict",
      });
      return { ok: true };
    },
  );
  app.get("/api/admin/session", { preHandler: admin }, async () => ({
    authenticated: true,
  }));
  app.get("/api/admin/audit", { preHandler: admin }, async () => ({
    events: data.db
      .prepare("SELECT event,time FROM audit ORDER BY id DESC LIMIT 30")
      .all(),
  }));
  app.post(
    "/api/admin/password",
    {
      preHandler: admin,
      config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const input = z
        .object({
          current: z.string().min(1).max(256),
          next: z.string().min(12).max(256),
        })
        .parse(request.body);
      if (!(await verifyPassword(input.current, currentHash())))
        return reply.code(401).send({
          message: "Неверный текущий пароль / Incorrect current password",
        });
      data.db
        .prepare("UPDATE credentials SET hash=? WHERE id=1")
        .run(hashPassword(input.next));
      data.db.prepare("DELETE FROM sessions WHERE kind='admin'").run();
      events.revoke();
      reply.clearCookie("veyl_admin", {
        path: "/",
        httpOnly: true,
        secure: !!options.production,
        sameSite: "strict",
      });
      data.audit("password changed");
      return { ok: true };
    },
  );
  app.get("/api/admin/site", { preHandler: admin }, async () =>
    effectiveSite(),
  );
  app.put("/api/admin/site", { preHandler: admin }, async (request, reply) => {
    const input = z
      .object({ site: siteSchema, revision: z.number().int().min(0) })
      .parse(request.body);
    const revision = data.saveSite(input.site as SiteData, input.revision);
    if (revision === null)
      return reply.code(409).send({
        message:
          "Данные изменились в другой вкладке. Обнови страницу и повтори правку / Data changed in another tab. Refresh before editing.",
      });
    data.audit("site update");
    events.notify("site");
    return {
      revision,
      effectiveStatus: resolveStatus(input.site as SiteData).status,
    };
  });
  app.post(
    "/api/chat/session",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = visitorSchema.parse(request.body);
      if (input.website)
        return reply
          .code(400)
          .send({ message: "Запрос отклонён / Request rejected" });
      const existing = session(request, "visitor");
      if (existing) {
        if (input.name || input.contact)
          data.db
            .prepare("UPDATE conversations SET name=?,contact=? WHERE id=?")
            .run(input.name, input.contact, existing.subject);
        return { id: existing.subject };
      }
      const id = randomUUID(),
        now = new Date().toISOString();
      data.db
        .prepare(
          "INSERT INTO conversations(id,name,contact,createdAt,updatedAt) VALUES(?,?,?,?,?)",
        )
        .run(id, input.name, input.contact, now, now);
      issueSession(reply, "visitor", id);
      return { id };
    },
  );
  app.get("/api/chat/messages", { preHandler: visitor }, async (request) => {
    const id = session(request, "visitor")!.subject;
    const chat = data.conversations().find((chat) => chat.id === id);
    return {
      messages: data.messages(id),
      conversation: chat
        ? {
            id: chat.id,
            name: chat.name,
            contact: chat.contact,
            state: chat.state,
          }
        : null,
    };
  });
  app.post("/api/chat/profile", { preHandler: visitor }, async (request) => {
    const input = visitorSchema.parse(request.body);
    data.db
      .prepare("UPDATE conversations SET name=?,contact=? WHERE id=?")
      .run(input.name, input.contact, session(request, "visitor")!.subject);
    return { ok: true };
  });
  app.post("/api/chat/read", { preHandler: visitor }, async (request) => {
    const id = session(request, "visitor")!.subject;
    const result = data.db
      .prepare(
        "UPDATE messages SET readAt=? WHERE conversation=? AND sender='owner' AND readAt IS NULL",
      )
      .run(new Date().toISOString(), id);
    if (result.changes) events.notify("chat", id);
    return { ok: true };
  });
  app.post(
    "/api/chat/messages",
    {
      preHandler: visitor,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const input = messageSchema.parse(request.body);
      if (input.website)
        return reply
          .code(400)
          .send({ message: "Запрос отклонён / Request rejected" });
      if (!chatAllowed(request))
        return reply.code(403).send({
          message:
            "Сейчас отправка сообщений недоступна / Messages are unavailable right now",
        });
      const id = session(request, "visitor")!.subject,
        now = new Date().toISOString();
      const message = {
        id: randomUUID(),
        text: input.text,
        sender: "visitor" as const,
        time: now,
        readAt: null,
      };
      data.db
        .prepare(
          "INSERT INTO messages(id,conversation,text,sender,time) VALUES(?,?,?,?,?)",
        )
        .run(message.id, id, message.text, message.sender, now);
      data.db
        .prepare(
          "UPDATE conversations SET updatedAt=?,state='active',archived=0 WHERE id=?",
        )
        .run(now, id);
      events.notify("chat", id);
      return message;
    },
  );
  app.get("/api/admin/conversations", { preHandler: admin }, async () => ({
    conversations: data.conversations(),
  }));
  app.get<{ Params: { id: string } }>(
    "/api/admin/conversations/:id/messages",
    { preHandler: admin },
    async (request, reply) => {
      if (
        !data.db
          .prepare("SELECT id FROM conversations WHERE id=?")
          .get(request.params.id)
      )
        return reply
          .code(404)
          .send({ message: "Диалог не найден / Conversation not found" });
      return { messages: data.messages(request.params.id) };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/admin/conversations/:id/read",
    { preHandler: admin },
    async (request) => {
      const result = data.db
        .prepare(
          "UPDATE messages SET readAt=? WHERE conversation=? AND sender='visitor' AND readAt IS NULL",
        )
        .run(new Date().toISOString(), request.params.id);
      if (result.changes) events.notify("chat", request.params.id);
      return { ok: true };
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/admin/conversations/:id/messages",
    { preHandler: admin },
    async (request, reply) => {
      const { text } = messageSchema.parse(request.body);
      if (
        !data.db
          .prepare("SELECT id FROM conversations WHERE id=?")
          .get(request.params.id)
      )
        return reply
          .code(404)
          .send({ message: "Диалог не найден / Conversation not found" });
      const now = new Date().toISOString(),
        message = {
          id: randomUUID(),
          text,
          sender: "owner" as const,
          time: now,
          readAt: null,
        };
      data.db
        .prepare(
          "INSERT INTO messages(id,conversation,text,sender,time) VALUES(?,?,?,?,?)",
        )
        .run(message.id, request.params.id, text, "owner", now);
      data.db
        .prepare(
          "UPDATE conversations SET updatedAt=?,state=CASE WHEN state='blocked' THEN 'blocked' ELSE 'waiting' END WHERE id=?",
        )
        .run(now, request.params.id);
      events.notify("chat", request.params.id);
      return message;
    },
  );
  app.patch<{ Params: { id: string } }>(
    "/api/admin/conversations/:id",
    { preHandler: admin },
    async (request, reply) => {
      const input = conversationSchema.parse(request.body);
      if (
        !data.db
          .prepare("SELECT id FROM conversations WHERE id=?")
          .get(request.params.id)
      )
        return reply
          .code(404)
          .send({ message: "Диалог не найден / Conversation not found" });
      for (const [key, value] of Object.entries(input))
        data.db
          .prepare(`UPDATE conversations SET ${key}=? WHERE id=?`)
          .run(
            typeof value === "boolean" ? Number(value) : value,
            request.params.id,
          );
      events.notify("chat", request.params.id);
      return { ok: true };
    },
  );
  app.post(
    "/api/admin/cover",
    { preHandler: admin, bodyLimit: 2_000_000 },
    async (request, reply) => {
      if (!options.uploadRoot)
        return reply.code(503).send({
          message:
            "Хранилище изображений недоступно / Image storage unavailable",
        });
      const { content } = z
        .object({ content: z.string().min(20).max(1_900_000) })
        .parse(request.body);
      const match =
        /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(content);
      if (!match)
        return reply.code(400).send({
          message: "Нужен PNG, JPEG или WebP / PNG, JPEG or WebP required",
        });
      const bytes = Buffer.from(match[2]!, "base64"),
        type = match[1]!;
      const valid =
        type === "png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : type === "jpeg"
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP";
      if (!valid || bytes.length > 1_400_000)
        return reply.code(400).send({
          message:
            "Изображение слишком большое или повреждено / Invalid or oversized image",
        });
      const name = `${randomUUID()}.${type === "jpeg" ? "jpg" : type}`;
      mkdirSync(options.uploadRoot, { recursive: true });
      writeFileSync(resolve(options.uploadRoot, name), bytes);
      return { url: `/uploads/${name}` };
    },
  );
  function stream(
    request: FastifyRequest,
    reply: FastifyReply,
    kind: "public" | "admin" | "visitor",
  ) {
    const active = kind === "public" ? undefined : session(request, kind);
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    events.attach({
      response: reply.raw,
      kind,
      subject: active?.subject ?? "",
      expires: active?.expires ?? Date.now() + 3600000,
      sessionHash: active?.hash,
    });
  }
  app.get("/api/public/events", async (request, reply) =>
    stream(request, reply, "public"),
  );
  app.get("/api/admin/events", { preHandler: admin }, async (request, reply) =>
    stream(request, reply, "admin"),
  );
  app.get("/api/chat/events", { preHandler: visitor }, async (request, reply) =>
    stream(request, reply, "visitor"),
  );
  if (options.uploadRoot) {
    mkdirSync(options.uploadRoot, { recursive: true });
    await app.register(staticFiles, {
      root: options.uploadRoot,
      prefix: "/uploads/",
      decorateReply: false,
      dotfiles: "deny",
    });
  }
  if (options.staticRoot && existsSync(options.staticRoot)) {
    const publicOrigin = new URL(options.origin).origin;
    const html = readFileSync(resolve(options.staticRoot, "index.html"), "utf8")
      .replace(
        'content="/assets/banner.webp"',
        `content="${publicOrigin}/assets/banner.webp"`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${publicOrigin}/" /><meta property="og:url" content="${publicOrigin}/" /></head>`,
      );
    app.get("/", async (_request, reply) =>
      reply.type("text/html; charset=utf-8").send(html),
    );
    app.get("/admin", async (_request, reply) =>
      reply
        .header("X-Robots-Tag", "noindex, nofollow")
        .type("text/html; charset=utf-8")
        .send(html),
    );
    app.get("/robots.txt", async (_request, reply) =>
      reply
        .type("text/plain")
        .send(
          `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${publicOrigin}/sitemap.xml\n`,
        ),
    );
    app.get("/sitemap.xml", async (_request, reply) =>
      reply
        .type("application/xml")
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${publicOrigin}/</loc></url></urlset>`,
        ),
    );
    await app.register(staticFiles, {
      root: options.staticRoot,
      dotfiles: "deny",
    });
    app.setNotFoundHandler((request, reply) =>
      request.method === "GET" &&
      !request.url.startsWith("/api/") &&
      !request.url.startsWith("/uploads/")
        ? reply.type("text/html; charset=utf-8").send(html)
        : reply.code(404).send({ message: "Not found" }),
    );
    app.addHook("onSend", async (request, reply) => {
      if (request.url.startsWith("/admin"))
        reply.header("X-Robots-Tag", "noindex, nofollow");
    });
  }
  let previousStatus = resolveStatus(data.getSite().site).status;
  const timer = setInterval(() => {
    const current = effectiveSite().effectiveStatus;
    if (current !== previousStatus) {
      previousStatus = current;
      events.notify("site");
    }
    data.db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  }, 1000);
  timer.unref();
  app.addHook("preClose", async () => {
    clearInterval(timer);
    events.close();
  });
  app.addHook("onClose", async () => {
    data.db.close();
  });
  return app;
}
