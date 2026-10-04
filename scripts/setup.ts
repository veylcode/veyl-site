import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { hashPassword } from "../server/auth.ts";
if (existsSync(".env.local")) {
  console.log("Existing local environment preserved.");
} else {
  const password = randomBytes(18).toString("base64url");
  mkdirSync("work", { recursive: true });
  writeFileSync(
    ".env.local",
    `ADMIN_PASSWORD_HASH=${hashPassword(password)}\nDATABASE_PATH=data/veyl.sqlite\nPUBLIC_ORIGIN=http://127.0.0.1:5173\nPORT=3001\nHOST=127.0.0.1\n`,
    { mode: 0o600 },
  );
  writeFileSync(
    "work/admin-access.txt",
    `Veyl / Admin\n\nhttp://127.0.0.1:5173/admin\n\nPassword: ${password}\n\nPrivate local file. Not included in GitHub. Do not share it.\n`,
    { mode: 0o600 },
  );
  console.log(
    "Local credentials created. Password is in work/admin-access.txt. It was not printed or added to source.",
  );
}
