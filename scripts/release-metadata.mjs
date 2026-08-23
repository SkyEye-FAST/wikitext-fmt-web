import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function changelogSection(changelog, heading) {
  const headings = [...changelog.matchAll(/^## (?!#)(.+)$/gmu)];
  const index = headings.findIndex((match) => match[1] === heading);
  if (index === -1) {
    throw new Error(`CHANGELOG.md is missing "## ${heading}".`);
  }
  const current = headings[index];
  const next = headings[index + 1];
  if (!current) throw new Error(`Could not read "## ${heading}".`);
  return changelog
    .slice(current.index + current[0].length, next?.index)
    .trim();
}

function releaseHeading(changelog, version) {
  const escapedVersion = version.replaceAll(".", "\\.");
  const headingPattern = new RegExp(
    `^${escapedVersion} — \\d{4}-\\d{2}-\\d{2}$`,
    "u",
  );
  const matches = [...changelog.matchAll(/^## (?!#)(.+)$/gmu)]
    .map((match) => match[1])
    .filter((heading) => heading !== undefined && headingPattern.test(heading));
  if (matches.length !== 1 || !matches[0]) {
    throw new Error(
      `CHANGELOG.md must contain exactly one "## ${version} — YYYY-MM-DD" release heading.`,
    );
  }
  return matches[0];
}

const tag = argument("--tag");
const notesPath = argument("--notes");
if (!tag) {
  throw new Error("Usage: release-metadata.mjs --tag web-v<version> [--notes path]");
}

const packageMetadata = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const version = packageMetadata.version;
if (typeof version !== "string" || !semverPattern.test(version)) {
  throw new Error("package.json version must be a stable SemVer value.");
}
const expectedTag = `web-v${version}`;
if (tag !== expectedTag) {
  throw new Error(`Expected tag ${expectedTag}, received ${tag}.`);
}

const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
if (changelogSection(changelog, "Unreleased") !== "") {
  throw new Error("CHANGELOG.md Unreleased must be empty for a release.");
}
const releaseNotes = changelogSection(changelog, releaseHeading(changelog, version));
if (!releaseNotes) {
  throw new Error(`CHANGELOG.md ${version} release notes must be non-empty.`);
}

if (notesPath) {
  await mkdir(dirname(notesPath), { recursive: true });
  await writeFile(notesPath, `${releaseNotes}\n`, "utf8");
}

process.stdout.write(
  `${JSON.stringify(
    {
      version,
      tag: expectedTag,
      title: `Wikitext Formatter Web ${version}`,
      tarball: `wikitext-fmt-web-${version}.tar.gz`,
    },
    null,
    2,
  )}\n`,
);
