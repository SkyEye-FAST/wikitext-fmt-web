import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const distDirectory = new URL("../dist/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", distDirectory), "utf8"));
const assetDirectory = new URL("assets/", distDirectory);
const assetNames = await readdir(assetDirectory);

const forbiddenWorkerPatterns = [
  "node:fs",
  "node:path",
  "node:module",
  "node:url",
  "fast-glob",
  "wikitext-fmt/src/",
  "wikitext-fmt/dist/",
  "packages/vscode",
  "config-discovery",
  "src/cli",
];

function findManifestFile(predicate) {
  const entry = Object.entries(manifest).find(predicate);
  return entry?.[1]?.file;
}

const initialFile = manifest["index.html"]?.file;
const diffFile = findManifestFile(([key]) => key.endsWith("/DiffView.tsx"));
const settingsFile = findManifestFile(([key]) => key.endsWith("/SettingsPanel.tsx"));
const workerFiles = assetNames.filter((name) =>
  /^(formatter\.worker|bundle-lsp\.min)-.*\.js$/.test(name),
);

if (!initialFile || !diffFile || workerFiles.length < 2) {
  throw new Error("Could not identify the initial app, diff chunk, and complete formatter Worker graph.");
}

async function sizeReport(label, files) {
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const url = new URL(file.startsWith("assets/") ? file : `assets/${file}`, distDirectory);
    const contents = await readFile(url);
    raw += contents.byteLength;
    gzip += gzipSync(contents).byteLength;
  }
  return { label, files, raw, gzip };
}

const reports = await Promise.all([
  sizeReport("Initial application JavaScript", [initialFile]),
  sizeReport("Formatter Worker graph", workerFiles),
  sizeReport("Diff chunk", [diffFile]),
  ...(settingsFile ? [sizeReport("Settings chunk", [settingsFile])] : []),
]);

for (const workerFile of workerFiles) {
  const contents = await readFile(new URL(`assets/${workerFile}`, distDirectory), "utf8");
  for (const forbidden of forbiddenWorkerPatterns) {
    if (contents.includes(forbidden)) {
      throw new Error(`Forbidden Worker dependency marker ${JSON.stringify(forbidden)} found in ${workerFile}.`);
    }
  }
}

const initialContents = await readFile(new URL(initialFile, distDirectory), "utf8");
if (initialContents.includes("formatWikitextSafeDetailed")) {
  throw new Error("Formatter runtime code leaked into the main application bundle.");
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

console.log("Bundle baseline (no failure thresholds):");
for (const report of reports) {
  console.log(`- ${report.label}: ${formatBytes(report.raw)} raw, ${formatBytes(report.gzip)} gzip`);
  for (const file of report.files) {
    const fileStat = await stat(new URL(file.startsWith("assets/") ? file : `assets/${file}`, distDirectory));
    console.log(`  ${path.basename(file)} (${formatBytes(fileStat.size)})`);
  }
}
console.log("Worker dependency denylist: clear");
