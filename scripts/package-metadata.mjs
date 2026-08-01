import { readFileSync } from "node:fs";

const exactSemverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function getPackageVersions(
  packageUrl = new URL("../package.json", import.meta.url),
) {
  const packageMetadata = JSON.parse(readFileSync(packageUrl, "utf8"));
  const webVersion = packageMetadata.version;
  const formatterVersion = packageMetadata.dependencies?.["wikitext-fmt"];

  if (typeof webVersion !== "string" || !exactSemverPattern.test(webVersion)) {
    throw new Error("package.json version must be an exact SemVer value.");
  }
  if (typeof formatterVersion !== "string") {
    throw new Error('package.json must declare dependencies["wikitext-fmt"].');
  }
  if (!exactSemverPattern.test(formatterVersion)) {
    throw new Error('dependencies["wikitext-fmt"] must be an exact SemVer value, not a range.');
  }

  return { webVersion, formatterVersion };
}
