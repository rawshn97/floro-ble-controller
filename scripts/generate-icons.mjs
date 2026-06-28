import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "logo.png");
const outDir = join(root, "icons");

mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  execSync(`sips -z ${size} ${size} "${src}" --out "${join(outDir, name)}"`, {
    stdio: "inherit",
  });
  console.log(`Wrote icons/${name}`);
}
