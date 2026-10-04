import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createSeed } from "../src/data/seed.ts";
import {
  additionalProjects,
  staffCoreDescription,
  staffCoreDescriptionEn,
} from "../src/data/additional-projects.ts";
import type { Conversation, Message, SiteData } from "../src/types.ts";

export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, kind TEXT NOT NULL, subject TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'new', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0, muted INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation TEXT NOT NULL REFERENCES conversations(id), text TEXT NOT NULL, sender TEXT NOT NULL, time TEXT NOT NULL, readAt TEXT);
    CREATE INDEX IF NOT EXISTS message_conversation_time ON messages(conversation,time);
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, event TEXT NOT NULL, time TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS credentials (id INTEGER PRIMARY KEY CHECK(id=1), hash TEXT NOT NULL);
  `);
  db.prepare(
    "INSERT OR IGNORE INTO settings(id,data,revision) VALUES(1,?,0)",
  ).run(JSON.stringify(createSeed()));
  const stored = db.prepare("SELECT data FROM settings WHERE id=1").get() as {
    data: string;
  };
  const existing = JSON.parse(stored.data) as SiteData;
  let migrated = false;
  if (!existing.workload) {
    existing.workload = { projectNames: [], showNames: true, count: 0 };
    migrated = true;
  }
  if (existing.statusDefinitions.some((item) => !item)) {
    existing.statusDefinitions = existing.statusDefinitions.filter(Boolean);
    migrated = true;
  }
  if (!existing.statusDefinitions.some((item) => item.id === "projects")) {
    const definition = createSeed().statusDefinitions.find(
      (item) => item.id === "projects",
    );
    if (definition) {
      existing.statusDefinitions.push(definition);
      migrated = true;
    }
  }
  db.exec("CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY)");
  if (
    !db
      .prepare("SELECT id FROM migrations WHERE id=?")
      .get("portfolio-expansion-1")
  ) {
    for (const project of additionalProjects)
      if (!existing.projects.some((item) => item.id === project.id))
        existing.projects.push(structuredClone(project));
    const staff = existing.projects.find((item) => item.id === "staffcore");
    if (
      staff &&
      staff.description ===
        "Инструменты команды сервера: роли, модерация и управление персоналом."
    ) {
      staff.description = staffCoreDescription;
      staff.descriptionEn = staffCoreDescriptionEn;
      staff.stack = "Java / Paper 1.21.11 / Staff mode / Ray tracing";
      staff.role = "Разработка инструментов команды";
      staff.roleEn = "Staff tools development";
      staff.state = "completed";
    }
    db.prepare("INSERT INTO migrations(id) VALUES(?)").run(
      "portfolio-expansion-1",
    );
    migrated = true;
  }
  if (existing.settings.telegram === "https://t.me/ne_west") {
    existing.settings.telegram = "https://t.me/veyldev";
    migrated = true;
  }
  if (existing.settings.discord === "newest1k") {
    existing.settings.discord = "veyl.core";
    migrated = true;
  }
  const roles: Record<string, string> = {
    "Owner · Technical Lead": "Владелец и технический разработчик",
    "Technical Administrator": "Технический администратор",
    "Systems Administrator": "Разработка игровых систем",
    "Tech / Staff Operations": "Техническая поддержка и работа с командой",
  };
  for (const project of existing.projects)
    if (project.role && roles[project.role]) {
      project.role = roles[project.role]!;
      migrated = true;
    }
  for (const project of existing.projects) {
    const updated = project.description
      .replace(
        "Полная техническая разработка сети по типу AxoSquad:",
        "Техническая разработка сети:",
      )
      .replace(
        " Название изменено; текущее состояние проекта мне неизвестно.",
        "",
      )
      .replace(
        " Больше не участвую в поддержке и не знаю текущее состояние проекта.",
        "",
      )
      .replace(
        " Больше не участвую в поддержке; текущее состояние неизвестно.",
        "",
      )
      .replace(" Сейчас не поддерживаю проект и не знаю, что с ним стало.", "");
    if (updated !== project.description) {
      project.description = updated;
      migrated = true;
    }
  }
  if (!Array.isArray(existing.cases)) {
    existing.cases = createSeed().cases;
    migrated = true;
  }
  if (migrated) {
    db.prepare("UPDATE settings SET data=?,revision=revision+1 WHERE id=1").run(
      JSON.stringify(existing),
    );
  }
  function getSite() {
    const row = db
      .prepare("SELECT data,revision FROM settings WHERE id=1")
      .get() as { data: string; revision: number };
    return { site: JSON.parse(row.data) as SiteData, revision: row.revision };
  }
  function saveSite(site: SiteData, expectedRevision: number) {
    const result = db
      .prepare(
        "UPDATE settings SET data=?, revision=revision+1 WHERE id=1 AND revision=?",
      )
      .run(JSON.stringify(site), expectedRevision);
    return result.changes ? expectedRevision + 1 : null;
  }
  function conversations(): Conversation[] {
    const rows = db
      .prepare(
        `SELECT c.*, COALESCE((SELECT text FROM messages WHERE conversation=c.id ORDER BY time DESC,rowid DESC LIMIT 1),'') AS lastMessage, (SELECT COUNT(*) FROM messages WHERE conversation=c.id AND sender='visitor' AND readAt IS NULL) AS unread FROM conversations c ORDER BY pinned DESC,updatedAt DESC`,
      )
      .all();
    return rows.map((row) => ({
      ...row,
      pinned: !!row.pinned,
      archived: !!row.archived,
      muted: !!row.muted,
    })) as unknown as Conversation[];
  }
  function messages(id: string): Message[] {
    return db
      .prepare(
        "SELECT id,text,sender,time,readAt FROM messages WHERE conversation=? ORDER BY time DESC,rowid DESC LIMIT 2000",
      )
      .all(id)
      .reverse() as unknown as Message[];
  }
  function audit(event: string) {
    db.prepare("INSERT INTO audit(event,time) VALUES(?,?)").run(
      event,
      new Date().toISOString(),
    );
  }
  return { db, getSite, saveSite, conversations, messages, audit };
}
