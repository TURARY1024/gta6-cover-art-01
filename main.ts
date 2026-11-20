// Leonida Cover Lab — the hand-in program.
// Copies the app and its screenshots into the output directory, then writes
// the dossier the scorer rebuilds with the kit's buildDossier.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });

for (const part of ["app", "screenshots"]) {
  const from = join(here, part);
  if (existsSync(from)) {
    cpSync(from, join(outDir, part), { recursive: true });
  }
}

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};
writeFileSync(join(outDir, "dossier.json"), buildDossier(outDir, caps));
console.log(`Leonida Cover Lab handed in to ${outDir}`);
