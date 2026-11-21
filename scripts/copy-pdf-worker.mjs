// Copies the pdf.js worker into public/ so the browser can load it from /pdf.worker.min.mjs.
// Runs after every npm install (postinstall), so the worker always matches the installed
// pdfjs-dist version. Serving it as a static file works the same with Turbopack in dev,
// `npm run build` and Vercel, without relying on how the bundler resolves worker URLs.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const target = join(root, "public", "pdf.worker.min.mjs");

if (!existsSync(source)) {
    console.warn("[copy-pdf-worker] pdfjs-dist is not installed; skipping.");
    process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("[copy-pdf-worker] Copied pdf.worker.min.mjs to public/");
