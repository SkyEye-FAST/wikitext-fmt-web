import { readFile } from "node:fs/promises";

import { getPackageVersions } from "./package-metadata.mjs";

const distDirectory = new URL("../dist/", import.meta.url);
const expected = getPackageVersions();
const emitted = JSON.parse(
  await readFile(new URL("build-metadata.json", distDirectory), "utf8"),
);
const manifest = JSON.parse(
  await readFile(new URL(".vite/manifest.json", distDirectory), "utf8"),
);
const initialFile = manifest["index.html"]?.file;

if (
  emitted.webVersion !== expected.webVersion ||
  emitted.formatterVersion !== expected.formatterVersion
) {
  throw new Error(
    `Built version metadata does not match package.json: ${JSON.stringify({ expected, emitted })}`,
  );
}
if (!initialFile) {
  throw new Error(
    "Could not identify the initial application chunk from the Vite manifest.",
  );
}

const initialContents = await readFile(
  new URL(initialFile, distDirectory),
  "utf8",
);
for (const version of [expected.webVersion, expected.formatterVersion]) {
  if (!initialContents.includes(version)) {
    throw new Error(
      `Initial application chunk does not contain displayed version ${version}.`,
    );
  }
}

console.log(
  `Build metadata verified: Web ${expected.webVersion} · Formatter ${expected.formatterVersion}`,
);
