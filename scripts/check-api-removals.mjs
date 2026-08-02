import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const projectDirectory = new URL("..", import.meta.url).pathname;
const forbiddenNames = [
  "formatTemplateParameters",
  "TemplateParameterDiagnostics",
  "templateParameterDiagnostics",
  "templatesFormatted",
  "templateParametersFormatted",
  "templateParameterLinesFormatted",
  "templateParameterLinesSkippedUnsafe",
  "ruleLevels.templateParameters",
];

const allowedCompatibilityFiles = new Set([
  "src/settings/storage.test.ts",
  "src/formatter/protocol.ts",
  "src/formatter/formatter.integration.test.ts",
  "e2e/formatter.spec.ts",
]);

function filesUnder(pathname) {
  const stat = statSync(pathname);
  if (stat.isFile()) return [pathname];
  return readdirSync(pathname, { withFileTypes: true }).flatMap((entry) =>
    filesUnder(join(pathname, entry.name)),
  );
}

const files = [
  ...filesUnder(join(projectDirectory, "src")),
  ...filesUnder(join(projectDirectory, "e2e")),
  join(projectDirectory, "README.md"),
];
const violations = [];

for (const pathname of files) {
  const relativePath = relative(projectDirectory, pathname);
  if (allowedCompatibilityFiles.has(relativePath)) continue;
  const contents = readFileSync(pathname, "utf8");
  for (const forbiddenName of forbiddenNames) {
    if (contents.includes(forbiddenName)) {
      violations.push(`${relativePath}: ${forbiddenName}`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(
    `Removed core API references found:\n${violations.join("\n")}`,
  );
}

console.log("web API-removal guard passed");
