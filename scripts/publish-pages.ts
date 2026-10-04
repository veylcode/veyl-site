import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PublicSite } from "../src/types.ts";

const repository = "https://github.com/veylcode/veyl-site.git";
const publicUrl = "https://veylcode.github.io/veyl-site/";
const origin = process.env.VEYL_EXPORT_ORIGIN || "http://127.0.0.1:3001";
const root = resolve(import.meta.dirname, "..");
const work = resolve(root, "work");
await mkdir(work, { recursive: true });
const output = await mkdtemp(resolve(work, "pages-"));

// Export only the public endpoint, never the database or admin settings.
const response = await fetch(`${origin}/api/public/site`);
if (!response.ok) throw new Error("Start the Veyl server before publishing.");
const site: PublicSite = await response.json();
site.settings.chatButtonRu = "Написать в Telegram";
site.settings.chatButtonEn = "Message on Telegram";
// Availability changes over time and must not masquerade as a live status.
site.settings.statusVisible = false;
execFileSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--outDir", output],
  {
    cwd: root,
    env: { ...process.env, VEYL_PAGES: "true", VITE_STATIC_SITE: "true" },
    stdio: "inherit",
  },
);
for (const project of site.projects) {
  if (!project.cover) continue;
  if (project.cover.startsWith("/uploads/")) {
    const image = await fetch(new URL(project.cover, origin));
    if (!image.ok) throw new Error(`Cannot export cover for ${project.name}`);
    const filename = project.cover.split("/").at(-1)!;
    if (!/^[a-zA-Z0-9.-]+$/.test(filename))
      throw new Error("Invalid cover path");
    await mkdir(resolve(output, "uploads"), { recursive: true });
    await writeFile(
      resolve(output, "uploads", filename),
      Buffer.from(await image.arrayBuffer()),
    );
    project.cover = `/veyl-site/uploads/${filename}`;
  } else if (project.cover.startsWith("/assets/")) {
    project.cover = `/veyl-site${project.cover}`;
  }
}
await writeFile(resolve(output, "site.json"), JSON.stringify(site));
await writeFile(resolve(output, ".nojekyll"), "");
let html = await readFile(resolve(output, "index.html"), "utf8");
html = html.replace(
  'content="/veyl-site/assets/banner.webp"',
  `content="${publicUrl}assets/banner.webp"`,
);
html = html.replace(
  "</head>",
  `<link rel="canonical" href="${publicUrl}" /><meta property="og:url" content="${publicUrl}" /></head>`,
);
await writeFile(resolve(output, "index.html"), html);
await writeFile(resolve(output, "404.html"), html);
await writeFile(
  resolve(output, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${publicUrl}sitemap.xml\n`,
);
await writeFile(
  resolve(output, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${publicUrl}</loc></url></urlset>`,
);

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: output, encoding: "utf8" }).trim();
}
git("init", "--initial-branch=gh-pages");
for (const key of ["user.name", "user.email"]) {
  const value = execFileSync("git", ["config", "--get", key], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  git("config", key, value);
}
git("remote", "add", "origin", repository);
let parent: string | undefined;
if (git("ls-remote", "--heads", "origin", "gh-pages")) {
  git("fetch", "--depth=1", "origin", "gh-pages");
  parent = git("rev-parse", "FETCH_HEAD");
}
git("add", "--all");
const tree = git("write-tree");
const commit = git(
  "commit-tree",
  tree,
  ...(parent ? ["-p", parent] : []),
  "-m",
  "Publish Veyl portfolio on GitHub Pages",
);
git("update-ref", "refs/heads/gh-pages", commit);
git("push", "origin", "gh-pages");
console.log(`Published build: ${commit}\nSite: ${publicUrl}`);
