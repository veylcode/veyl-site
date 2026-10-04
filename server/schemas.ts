import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
const url = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .max(500)
    .refine((value) => /^https?:\/\//.test(value)),
]);
export const statusSchema = z.object({
  id: text(50).regex(/^[a-z0-9-]+$/),
  label: text(70).min(1),
  nameRu: text(70).min(1),
  description: text(220),
  descriptionEn: text(220),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  responseTime: text(120),
  chatEnabled: z.boolean(),
  acceptingProjects: z.boolean(),
});
export const projectSchema = z.object({
  id: text(80).min(1),
  name: text(80).min(1),
  category: z.enum(["Minecraft", "Web", "Systems"]),
  description: text(1500),
  descriptionEn: text(1500).optional(),
  stack: text(300),
  visible: z.boolean(),
  state: z
    .enum(["active", "completed", "archived", "unknown", "draft", "private"])
    .optional(),
  role: text(100).optional(),
  roleEn: text(100).optional(),
  alias: z.boolean().optional(),
  link: url.optional(),
  cover: z
    .union([
      z.literal(""),
      z.string().regex(/^\/uploads\/[a-zA-Z0-9._-]+\.(webp|png|jpg|jpeg)$/),
      z.string().regex(/^\/assets\/[a-zA-Z0-9._-]+\.(webp|png|jpg|jpeg)$/),
    ])
    .optional(),
});
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const schedule = z
  .object({
    id: text(80).min(1),
    day: z.number().int().min(1).max(7),
    start: time,
    end: time,
    status: text(50),
    enabled: z.boolean(),
  })
  .refine((value) => value.start < value.end, {
    message:
      "Время окончания должно быть позже начала / End must be after start",
  });
export const siteSchema = z
  .object({
    content: z.object({
      title: text(100).min(1),
      titleEn: text(100).min(1),
      subtitle: text(450),
      subtitleEn: text(450),
      about: text(1200),
      aboutEn: text(1200),
    }),
    settings: z.object({
      telegram: url,
      discord: text(100),
      github: url,
      chatVisible: z.boolean(),
      statusVisible: z.boolean(),
      chatButtonRu: text(70).min(1),
      chatButtonEn: text(70).min(1),
    }),
    status: text(50),
    statusUntil: z.string().datetime().nullable(),
    statusFallback: text(50),
    statusDefinitions: z.array(statusSchema).min(1).max(30),
    schedules: z.array(schedule).max(50),
    quickReplies: z.array(text(2000).min(1)).max(30),
    projects: z.array(projectSchema).max(100),
    workload: z.object({
      projectNames: z.array(text(100).min(1)).max(30),
      showNames: z.boolean(),
      count: z.number().int().min(0).max(30),
    }),
    cases: z
      .array(
        z.object({
          id: text(80).min(1),
          title: text(100).min(1),
          titleEn: text(100).min(1),
          problem: text(1500),
          problemEn: text(1500),
          work: text(1500),
          workEn: text(1500),
          result: text(1500),
          resultEn: text(1500),
          stack: text(300),
          flow: text(150),
          visible: z.boolean(),
          needsReview: z.boolean(),
        }),
      )
      .max(100),
  })
  .superRefine((value, context) => {
    const ids = new Set(value.statusDefinitions.map((status) => status.id));
    if (new Set(value.cases.map((item) => item.id)).size !== value.cases.length)
      context.addIssue({ code: "custom", message: "Duplicate case ids" });
    if (ids.size !== value.statusDefinitions.length)
      context.addIssue({ code: "custom", message: "Duplicate status ids" });
    if (
      new Set(value.projects.map((project) => project.id)).size !==
      value.projects.length
    )
      context.addIssue({ code: "custom", message: "Duplicate project ids" });
    if (
      !ids.has(value.status) ||
      !ids.has(value.statusFallback) ||
      value.schedules.some((rule) => !ids.has(rule.status))
    )
      context.addIssue({ code: "custom", message: "Unknown status reference" });
  });
export const messageSchema = z.object({
  text: text(2000).min(1),
  website: text(200).optional(),
});
export const visitorSchema = z.object({
  name: text(70).default(""),
  contact: text(140).default(""),
  website: text(200).optional(),
});
export const conversationSchema = z.object({
  name: text(70).optional(),
  contact: text(140).optional(),
  state: z.enum(["new", "active", "waiting", "closed", "blocked"]).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  muted: z.boolean().optional(),
  notes: text(2000).optional(),
});
