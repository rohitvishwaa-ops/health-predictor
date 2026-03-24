import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const distDir = resolve(root, "frontend", "dist");
const publicDir = resolve(root, "public");

if (!existsSync(distDir)) {
  throw new Error("frontend/dist was not found. Build the frontend before preparing Vercel output.");
}

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
cpSync(distDir, publicDir, { recursive: true });
