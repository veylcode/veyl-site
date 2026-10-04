import { resolve } from "node:path";
import { buildApp } from "./app.ts";
const production = process.env.NODE_ENV === "production";
const origin =
  process.env.PUBLIC_ORIGIN ||
  (production ? "http://127.0.0.1:3001" : "http://127.0.0.1:5173");
const app = await buildApp({
  databasePath: resolve(process.env.DATABASE_PATH || "data/veyl.sqlite"),
  passwordHash: process.env.ADMIN_PASSWORD_HASH || "",
  origin,
  production,
  staticRoot: resolve("dist"),
  uploadRoot: resolve("data/uploads"),
});
await app.listen({
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 3001),
});
console.log(`Veyl server ready at port ${process.env.PORT || 3001}`);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
