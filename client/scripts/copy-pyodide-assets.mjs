import { existsSync, mkdirSync, cpSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../node_modules/pyodide");
const destDir = path.resolve(__dirname, "../public/pyodide");

// Only the large binary/data assets — the loader itself (pyodide.mjs) is
// imported as a normal npm package and bundled by Vite, not served statically.
const FILES = ["pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

if (!existsSync(srcDir)) {
  console.warn("[copy-pyodide-assets] pyodide package not found, skipping.");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

for (const file of FILES) {
  const from = path.join(srcDir, file);
  if (existsSync(from)) cpSync(from, path.join(destDir, file));
}

console.log(`[copy-pyodide-assets] copied Pyodide runtime to ${destDir}`);
