import { readFile, readdir, stat } from "node:fs/promises";
import { builtinModules } from "node:module";
import { gzipSync } from "node:zlib";
import path from "node:path";

const projectDirectory = new URL("../", import.meta.url);
const distDirectory = new URL("../dist/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", distDirectory), "utf8"));
const appGraph = JSON.parse(await readFile(new URL("app-bundle-graph.json", distDirectory), "utf8"));
const workerGraph = JSON.parse(await readFile(new URL("formatter-worker-graph.json", distDirectory), "utf8"));
const headers = await readFile(new URL("_headers", distDirectory), "utf8");

const rootNoTransformRule = "/\n  Cache-Control: public, max-age=0, must-revalidate, no-transform";
if (!headers.includes(rootNoTransformRule)) {
  throw new Error("The production root must opt out of Cloudflare response transformation.");
}

function assertGraph(graph, label) {
  if (!Array.isArray(graph?.chunks) || graph.chunks.some((chunk) =>
    typeof chunk?.file !== "string" || !Array.isArray(chunk.imports) ||
    !Array.isArray(chunk.dynamicImports) || !Array.isArray(chunk.modules))) {
    throw new Error(`${label} is not a valid emitted bundle graph.`);
  }
}

assertGraph(appGraph, "Application bundle graph");
assertGraph(workerGraph, "Formatter Worker bundle graph");

function findManifestEntry(sourceSuffix) {
  const matching = Object.entries(manifest).filter(([key]) => key.endsWith(sourceSuffix));
  if (matching.length !== 1) {
    throw new Error(`Expected one Vite manifest entry ending in ${sourceSuffix}; found ${matching.length}.`);
  }
  return matching[0];
}

function collectManifestEntries(entryKey) {
  const collected = new Set();
  const visit = (key) => {
    if (collected.has(key)) return;
    const entry = manifest[key];
    if (!entry) throw new Error(`Vite manifest references missing entry ${key}.`);
    collected.add(key);
    for (const imported of entry.imports ?? []) visit(imported);
  };
  visit(entryKey);
  return [...collected].map((key) => manifest[key]);
}

function collectChunkGraph(graph, entry, includeDynamicImports) {
  const chunksByFile = new Map(graph.chunks.map((chunk) => [chunk.file, chunk]));
  const collected = new Map();
  const visit = (file) => {
    if (collected.has(file)) return;
    const chunk = chunksByFile.get(file);
    if (!chunk) throw new Error(`Bundle graph references missing chunk ${file}.`);
    collected.set(file, chunk);
    const imports = includeDynamicImports ? [...chunk.imports, ...chunk.dynamicImports] : chunk.imports;
    for (const imported of imports) visit(imported);
  };
  visit(entry.file);
  return [...collected.values()];
}

const initialFile = manifest["index.html"]?.file;
if (!initialFile) {
  throw new Error("Could not identify the initial application entry from the Vite manifest.");
}
const initialChunk = appGraph.chunks.find((chunk) => chunk.file === initialFile);
if (!initialChunk) {
  throw new Error("The Vite initial application entry is absent from the emitted application graph.");
}
const initialEntries = collectManifestEntries("index.html");
const initialChunks = collectChunkGraph(appGraph, initialChunk, false);
const initialCss = [...new Set(initialEntries.flatMap((entry) => entry.css ?? []))];

const [, diffEntry] = findManifestEntry("/DiffView.tsx");
const [, settingsEntry] = findManifestEntry("/SettingsPanel.tsx");
const workerEntries = workerGraph.chunks.filter((chunk) =>
  chunk.isEntry && /(?:^|\/)src\/formatter\/formatter\.worker\.ts$/.test(chunk.facadeModuleId ?? ""),
);
if (workerEntries.length !== 1) {
  throw new Error(`Expected one formatter Worker entry; found ${workerEntries.length}.`);
}
const workerChunks = collectChunkGraph(workerGraph, workerEntries[0], true);

const builtinSpecifiers = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const forbiddenModulePatterns = [
  /(?:^|\/)fast-glob(?:\/|$)/,
  /(?:^|\/)packages\/vscode(?:\/|$)/,
  /(?:^|\/)src\/cli(?:\/|$)/,
  /config-discovery/,
  /\/wikitext-fmt\/(?:src|packages)(?:\/|$)/,
];

for (const chunk of workerChunks) {
  for (const id of [...chunk.modules, ...chunk.imports, ...chunk.dynamicImports]) {
    const unprefixed = id.startsWith("node:") ? id.slice(5) : id;
    if (builtinSpecifiers.has(id) || builtinSpecifiers.has(unprefixed)) {
      throw new Error(`Node built-in ${JSON.stringify(id)} found in the formatter Worker graph.`);
    }
    for (const pattern of forbiddenModulePatterns) {
      if (pattern.test(id)) {
        throw new Error(`Forbidden module ${JSON.stringify(id)} found in the formatter Worker graph.`);
      }
    }
  }
}

const initialModules = new Set(initialChunks.flatMap((chunk) => chunk.modules));
for (const id of initialModules) {
  if (/(?:^|\/)node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?wikitext-fmt(?:\/|$)/.test(id)) {
    throw new Error(`Formatter runtime module leaked into the initial application graph: ${id}`);
  }
}

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) files.push(...await sourceFiles(url));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(url);
  }
  return files;
}

for (const file of await sourceFiles(new URL("src/", projectDirectory))) {
  const contents = await readFile(file, "utf8");
  const deepImport = /(?:from\s+|import\s*\()\s*["']wikitext-fmt\/(?!browser["'])[^"']+/.exec(contents);
  if (deepImport) {
    throw new Error(`Deep wikitext-fmt import found in ${path.relative(new URL(".", projectDirectory).pathname, file.pathname)}: ${deepImport[0]}`);
  }
}

async function sizeReport(label, files) {
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const contents = await readFile(new URL(file, distDirectory));
    raw += contents.byteLength;
    gzip += gzipSync(contents).byteLength;
  }
  return { label, files, raw, gzip };
}

const reports = await Promise.all([
  sizeReport("Initial application JavaScript", initialChunks.map((chunk) => chunk.file)),
  sizeReport("Initial application CSS", initialCss),
  sizeReport("Formatter Worker graph", workerChunks.map((chunk) => chunk.file)),
  sizeReport("Diff chunk", [diffEntry.file]),
  sizeReport("Settings chunk", [settingsEntry.file]),
]);

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

console.log("Bundle baseline (no failure thresholds):");
for (const report of reports) {
  console.log(`- ${report.label}: ${formatBytes(report.raw)} raw, ${formatBytes(report.gzip)} gzip`);
  for (const file of report.files) {
    const fileStat = await stat(new URL(file, distDirectory));
    console.log(`  ${path.basename(file)} (${formatBytes(fileStat.size)})`);
  }
}
console.log("Manifest graph, Worker dependencies, and production headers: clear");
