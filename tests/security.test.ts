import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../server/app.ts";
import { hashPassword } from "../server/auth.ts";
import { createSeed } from "../src/data/seed.ts";
import { resolveStatus } from "../server/status.ts";

const password = "test-only-password-2026",
  origin = "http://localhost:5173";
const options = {
  databasePath: ":memory:",
  passwordHash: hashPassword(password),
  origin,
};
const cookie = (response: { cookies: { name: string; value: string }[] }) =>
  response.cookies.map((item) => `${item.name}=${item.value}`).join("; ");

test("admin authentication, cookie attributes and cross-origin protection", async () => {
  const app = await buildApp(options);
  try {
    for (const url of [
      "/api/admin/site",
      "/api/admin/conversations",
      "/api/admin/audit",
      "/api/admin/session",
    ])
      assert.equal((await app.inject({ url })).statusCode, 401);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/login",
          payload: { password },
          headers: { origin: "https://untrusted.example" },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/login",
          payload: { password: "wrong" },
          headers: { origin },
        })
      ).statusCode,
      401,
    );
    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { password },
      headers: { origin },
    });
    assert.equal(login.statusCode, 200);
    assert.match(String(login.headers["set-cookie"]), /HttpOnly/);
    assert.match(String(login.headers["set-cookie"]), /SameSite=Strict/);
    const headers = { origin, cookie: cookie(login) };
    assert.equal(
      (await app.inject({ url: "/api/admin/site", headers })).statusCode,
      200,
    );
    await app.inject({ method: "POST", url: "/api/admin/logout", headers });
    assert.equal(
      (await app.inject({ url: "/api/admin/site", headers })).statusCode,
      401,
    );
  } finally {
    await app.close();
  }
});

test("visitor sessions isolate conversations, private notes and sender identity", async () => {
  const app = await buildApp(options);
  try {
    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { password },
      headers: { origin },
    });
    const admin = { origin, cookie: cookie(login) };
    const first = await app.inject({
      method: "POST",
      url: "/api/chat/session",
      payload: { name: "First visitor" },
      headers: { origin },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/chat/session",
      payload: { name: "Second visitor" },
      headers: { origin },
    });
    const a = { origin, cookie: cookie(first) },
      b = { origin, cookie: cookie(second) },
      id = first.json().id as string;
    assert.notEqual(id, second.json().id);
    const sent = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      payload: {
        text: "Private request",
        sender: "owner",
        conversation: second.json().id,
      },
      headers: a,
    });
    assert.equal(sent.statusCode, 200);
    assert.equal(sent.json().sender, "visitor");
    assert.equal(
      (await app.inject({ url: "/api/chat/messages", headers: b })).json()
        .messages.length,
      0,
    );
    await app.inject({
      method: "PATCH",
      url: `/api/admin/conversations/${id}`,
      payload: { notes: "Owner-only private note", pinned: true },
      headers: admin,
    });
    const visitorData = (
      await app.inject({ url: "/api/chat/messages", headers: a })
    ).json();
    assert.equal(visitorData.conversation.notes, undefined);
    assert.equal(visitorData.conversation.pinned, undefined);
    assert.equal(
      (
        await app.inject({
          url: `/api/admin/conversations/${id}/messages`,
          headers: b,
        })
      ).statusCode,
      401,
    );
    await app.inject({
      method: "POST",
      url: `/api/admin/conversations/${id}/messages`,
      payload: { text: "Owner response" },
      headers: admin,
    });
    const received = (
      await app.inject({ url: "/api/chat/messages", headers: a })
    ).json();
    assert.equal(received.messages.at(-1).text, "Owner response");
    await app.inject({
      method: "POST",
      url: "/api/chat/read",
      payload: {},
      headers: a,
    });
    assert.ok(
      (
        await app.inject({
          url: `/api/admin/conversations/${id}/messages`,
          headers: admin,
        })
      )
        .json()
        .messages.at(-1).readAt,
    );
    await app.inject({
      method: "PATCH",
      url: `/api/admin/conversations/${id}`,
      payload: { state: "blocked" },
      headers: admin,
    });
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/chat/messages",
          payload: { text: "Blocked" },
          headers: a,
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/chat/messages",
          payload: { text: "x".repeat(2001) },
          headers: b,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/chat/messages",
          payload: { text: "Spam", website: "bot" },
          headers: b,
        })
      ).statusCode,
      400,
    );
  } finally {
    await app.close();
  }
});

test("site updates validate references, hide private projects and reject stale writes", async () => {
  const app = await buildApp(options);
  try {
    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { password },
      headers: { origin },
    });
    const headers = { origin, cookie: cookie(login) };
    const snapshot = (
      await app.inject({ url: "/api/admin/site", headers })
    ).json();
    snapshot.site.projects[0].state = "private";
    snapshot.site.projects[1].visible = false;
    snapshot.site.cases[0].visible = false;
    snapshot.site.workload = {
      projectNames: ["Private client project", "Another private project"],
      showNames: false,
      count: 2,
    };
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/admin/site",
          payload: snapshot,
          headers,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/admin/site",
          payload: snapshot,
          headers,
        })
      ).statusCode,
      409,
    );
    const publicData = (await app.inject({ url: "/api/public/site" })).json();
    assert.ok(
      !publicData.projects.some(
        (item: { id: string }) =>
          item.id === snapshot.site.projects[0].id ||
          item.id === snapshot.site.projects[1].id,
      ),
    );
    assert.equal(publicData.quickReplies, undefined);
    assert.equal(publicData.schedules, undefined);
    assert.deepEqual(publicData.workload.projectNames, []);
    assert.equal(publicData.workload.count, 2);
    assert.ok(
      !publicData.cases.some(
        (item: { id: string }) => item.id === snapshot.site.cases[0].id,
      ),
    );
    const fresh = (
      await app.inject({ url: "/api/admin/site", headers })
    ).json();
    fresh.site.status = "does-not-exist";
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/admin/site",
          payload: fresh,
          headers,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/cover",
          payload: { content: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" },
          headers,
        })
      ).statusCode,
      503,
    );
  } finally {
    await app.close();
  }
});

test("login attempts are rate limited", async () => {
  const app = await buildApp(options);
  try {
    for (let attempt = 0; attempt < 5; attempt++)
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/api/admin/login",
            payload: { password: "incorrect" },
            headers: { origin },
          })
        ).statusCode,
        401,
      );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/login",
          payload: { password },
          headers: { origin },
        })
      ).statusCode,
      429,
    );
  } finally {
    await app.close();
  }
});

test("password changes revoke sessions and survive server restart", async () => {
  const folder = mkdtempSync(join(tmpdir(), "veyl-test-")),
    persistent = { ...options, databasePath: join(folder, "site.sqlite") };
  const newPassword = "another-test-password-2026";
  let app = await buildApp(persistent);
  try {
    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { password },
      headers: { origin },
    });
    const headers = { origin, cookie: cookie(login) };
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/password",
          payload: { current: password, next: newPassword },
          headers,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ url: "/api/admin/session", headers })).statusCode,
      401,
    );
    await app.close();
    app = await buildApp(persistent);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/login",
          payload: { password },
          headers: { origin },
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/login",
          payload: { password: newPassword },
          headers: { origin },
        })
      ).statusCode,
      200,
    );
  } finally {
    await app.close();
    rmSync(folder, { recursive: true, force: true });
  }
});

test("timed statuses override Moscow schedules until expiry", () => {
  const site = createSeed();
  site.status = "vacation";
  site.statusFallback = "available";
  site.statusUntil = "2026-10-05T10:00:00.000Z";
  site.schedules = [
    {
      id: "school",
      day: 1,
      start: "08:00",
      end: "16:00",
      status: "school",
      enabled: true,
    },
  ];
  assert.deepEqual(resolveStatus(site, new Date("2026-10-05T09:00:00Z")), {
    status: "vacation",
    expired: false,
  });
  assert.deepEqual(resolveStatus(site, new Date("2026-10-05T10:01:00Z")), {
    status: "school",
    expired: true,
  });
  assert.deepEqual(resolveStatus(site, new Date("2026-10-05T14:00:00Z")), {
    status: "available",
    expired: true,
  });
});

test("expired vacation is persisted and image uploads reject active content", async () => {
  const folder = mkdtempSync(join(tmpdir(), "veyl-uploads-"));
  const app = await buildApp({ ...options, uploadRoot: folder });
  try {
    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { password },
      headers: { origin },
    });
    const headers = { origin, cookie: cookie(login) };
    const snapshot = (
      await app.inject({ url: "/api/admin/site", headers })
    ).json();
    snapshot.site.status = "vacation";
    snapshot.site.statusUntil = "2020-01-01T00:00:00.000Z";
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/admin/site",
          payload: snapshot,
          headers,
        })
      ).statusCode,
      200,
    );
    const publicData = (await app.inject({ url: "/api/public/site" })).json();
    assert.equal(publicData.status, "available");
    assert.equal(publicData.statusUntil, null);
    assert.equal(
      (await app.inject({ url: "/api/admin/site", headers })).json().site
        .status,
      "available",
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/cover",
          payload: { content: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" },
          headers,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/admin/cover",
          payload: {
            content: "data:image/png;base64,PHNjcmlwdD5iYWQ8L3NjcmlwdD4=",
          },
          headers,
        })
      ).statusCode,
      400,
    );
    const image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK8sAAAAASUVORK5CYII=";
    const upload = await app.inject({
      method: "POST",
      url: "/api/admin/cover",
      payload: { content: image },
      headers,
    });
    assert.equal(upload.statusCode, 200);
    assert.match(upload.json().url, /^\/uploads\/[a-f0-9-]+\.png$/);
    assert.equal(
      (await app.inject({ url: upload.json().url })).statusCode,
      200,
    );
  } finally {
    await app.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
