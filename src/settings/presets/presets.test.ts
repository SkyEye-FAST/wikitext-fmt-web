import { expect, it } from "vitest";
import { normalizeSiteProfile } from "wikitext-fmt/browser";

import minecraftJson from "./zh-minecraft-wiki.json?raw";

it("normalizes the bundled Chinese Minecraft Wiki profile with templates and interwiki", () => {
  const profile = normalizeSiteProfile(JSON.parse(minecraftJson));

  expect(profile.name).toBe("中文Minecraft Wiki");
  expect(profile.apiUrl).toBe("https://zh.minecraft.wiki/api.php");
  expect(profile.extensions.templateData).toBe(true);
  const templates = Object.values(profile.templates ?? {});
  expect(templates.length).toBeGreaterThan(0);
  expect(
    templates.every(
      (template) => Object.keys(template.params ?? {}).length > 0,
    ),
  ).toBe(true);
  expect(profile.templates?.Only?.params?.["1"]?.suggestedvalues).toContain(
    "JE",
  );
  expect(profile.interwiki).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ prefix: "en", language: "English" }),
    ]),
  );
});
