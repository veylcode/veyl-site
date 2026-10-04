import {
  createHash,
  randomBytes,
  scrypt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const candidate = await new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
  return timingSafeEqual(Buffer.from(hash, "hex"), candidate);
}
