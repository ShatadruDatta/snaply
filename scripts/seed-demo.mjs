// Run from the project root: node scripts/seed-demo.mjs [development-profile-handle]
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

function run(name, args) {
  const output = execFileSync("npx", ["convex", "run", "--deployment", "dev", "seed:" + name, JSON.stringify(args)],
    { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  return output.trim() ? JSON.parse(output) : null;
}

const viewerHandle = process.argv[2]?.replace(/^@/, "");
const assets = run("prepare", {});
for (let i = 0; i < assets.length; i += 8) {
  const batch = assets.slice(i, i + 8);
  const files = await Promise.all(batch.map(async ({ key, path, contentType, url }) => {
    const body = await readFile(path);
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body });
    if (!response.ok) throw new Error(`Could not stage ${path} (HTTP ${response.status}).`);
    return { key, id: (await response.json()).storageId };
  }));
  run("stage", { files });
}
console.log(run("apply", { viewerHandle }));
