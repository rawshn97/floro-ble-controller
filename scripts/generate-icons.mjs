import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
  const output = join(outDir, name);
  if (process.platform === "darwin") {
    execFileSync("sips", ["-z", String(size), String(size), src, "--out", output], {
      stdio: "inherit",
    });
    console.log(`Wrote icons/${name}`);
    continue;
  }

  if (!existsSync(output)) {
    throw new Error(`Missing icons/${name}; regenerate icons on macOS with sips`);
  }
  const png = readFileSync(output);
  const isPng = png.length >= 24 && png.subarray(1, 4).toString("ascii") === "PNG";
  const width = isPng ? png.readUInt32BE(16) : 0;
  const height = isPng ? png.readUInt32BE(20) : 0;
  if (width !== size || height !== size) {
    throw new Error(`icons/${name} must be ${size}x${size}, got ${width}x${height}`);
  }
  console.log(`Verified icons/${name} (${size}x${size})`);
}
