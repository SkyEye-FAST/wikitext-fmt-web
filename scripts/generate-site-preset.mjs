// Refresh with: node scripts/generate-site-preset.mjs
import { mkdir, writeFile } from "node:fs/promises";
import {
  loadSiteProfile,
  siteProfileTemplateDataUrl,
  normalizeTemplateDataResponse,
  normalizeSiteProfile,
  serializeSiteProfile,
} from "wikitext-fmt";

const apiUrl = "https://zh.minecraft.wiki/api.php";
// The wiki reports "Minecraft Wiki", the same as the English wiki.
const name = "Minecraft Wiki (ZH)";
const output = new URL(
  "../src/settings/presets/zh-minecraft-wiki.json",
  import.meta.url,
);
const userAgent =
  "WikitextFmtWeb-SitePreset/0.6 (https://github.com/SkyEye-FAST/wikitext-fmt-web)";

// Discovered via Mostlinkedtemplates and templates on 石头, 钻石, 僵尸,
// 平原 and Minecraft. Keep the wiki's actual titles, which are mostly English.
// Query infoboxes too, so a refresh includes them if TemplateData is added.
const titles = [
  "Infobox block",
  "Infobox item",
  "Infobox entity",
  "Infobox biome",
  "Editions",
  "In",
  "Only",
  "Until",
  "Upcoming",
  "About",
  "See also",
  "Citation",
  "Citation needed",
  "Note",
  "Quote",
  "BlockLink",
  "ItemLink",
  "EntityLink",
  "BiomeLink",
  "EffectLink",
  "BlockSprite",
  "ItemSprite",
  "EntitySprite",
  "Mob icon",
  "Code",
  "STConversion",
  "CollapseH",
  "Flatlist",
];

async function wikiFetch(url, init) {
  const headers = new Headers(init?.headers);
  headers.set("User-Agent", userAgent);
  const response = await fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Wiki request blocked or failed: HTTP ${response.status} (${url})`,
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      `Wiki returned non-JSON data, possibly a challenge page (${url})`,
    );
  }
  return response;
}

// MediaWiki emits null for unset optional fields; the profile API models
// them by absence. Omit the unset fields without adding data.
function omitUnsetFields(record, keys) {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([key, value]) => value !== null || !keys.includes(key),
    ),
  );
}

try {
  const profile = await loadSiteProfile(apiUrl, wikiFetch);
  const templates = {};
  if (profile.extensions.templateData) {
    const response = await wikiFetch(
      siteProfileTemplateDataUrl(apiUrl, titles, "zh"),
    );
    const payload = await response.json();
    if (payload.error) {
      throw new Error(
        `TemplateData API error: ${JSON.stringify(payload.error)}`,
      );
    }
    if (!payload.pages || typeof payload.pages !== "object") {
      throw new Error("TemplateData response has no pages");
    }
    const requested = new Set(titles.map((title) => `Template:${title}`));
    const pages = Object.fromEntries(
      Object.entries(payload.pages)
        .filter(
          ([, page]) =>
            requested.has(page.title) &&
            !page.missing &&
            !page.notemplatedata &&
            page.params &&
            Object.keys(page.params).length > 0,
        )
        .map(([id, page]) => [
          id,
          {
            ...omitUnsetFields(page, ["description", "format", "paramOrder"]),
            params: Object.fromEntries(
              Object.entries(page.params).map(([name, parameter]) => [
                name,
                omitUnsetFields(parameter, [
                  "label",
                  "description",
                  "default",
                  "example",
                  "autovalue",
                ]),
              ]),
            ),
          },
        ]),
    );
    Object.assign(templates, normalizeTemplateDataResponse({ pages }));
    if (Object.keys(templates).length === 0) {
      throw new Error(
        "No requested templates returned TemplateData with parameters",
      );
    }
  }
  const normalized = normalizeSiteProfile({ ...profile, name, templates });
  const serialized = serializeSiteProfile(normalized);
  await mkdir(new URL(".", output), { recursive: true });
  await writeFile(output, serialized);
  console.log(`TemplateData extension: ${profile.extensions.templateData}`);
  console.log(
    `Included (${Object.keys(templates).length}): ${Object.keys(templates).join(", ")}`,
  );
  console.log(
    `Skipped: ${titles.filter((title) => !Object.hasOwn(templates, title)).join(", ")}`,
  );
  console.log(
    `Wrote ${output.pathname} (${Buffer.byteLength(serialized)} bytes)`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
