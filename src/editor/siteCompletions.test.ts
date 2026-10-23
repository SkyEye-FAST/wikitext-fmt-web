import type { SiteProfile, SiteProfileTemplate } from "wikitext-fmt/browser";
import { describe, expect, it, vi } from "vitest";

import {
  CompletionContext,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";

import {
  createSiteCompletionSource,
  interfaceText,
  parameterCompletions,
} from "./siteCompletions.js";

const template: SiteProfileTemplate = {
  params: {
    old: { deprecated: "Use name" },
    optional: {
      label: { en: "Optional", "zh-hant": "選填" },
      description: { en: "A description" },
    },
    suggested: { suggested: true },
    name: {
      required: true,
      aliases: ["n"],
      suggestedvalues: ["Alpha", "Beta"],
    },
    other: {},
  },
  paramOrder: ["name", "suggested", "other", "optional", "old"],
};
const profile: SiteProfile = {
  schemaVersion: 1,
  name: "Wiki",
  apiUrl: "https://wiki.example/api.php",
  extensions: { templateData: true },
  templates: { Info: template },
  interwiki: [{ prefix: "en", language: "English", url: "//en.example/$1" }],
};

async function complete(source: CompletionSource, marked: string) {
  const pos = marked.indexOf("¦");
  const state = EditorState.create({ doc: marked.replace("¦", "") });
  return await source(new CompletionContext(state, pos, false));
}

describe("site completions", () => {
  it("offers template names and interwiki prefixes without requests", async () => {
    const load = vi.fn();
    const source = createSiteCompletionSource(profile, "en", load);
    expect((await complete(source, "{{I¦"))?.options).toMatchObject([
      { label: "Info" },
    ]);
    expect((await complete(source, "[[e¦"))?.options).toMatchObject([
      { label: "en", apply: "en:", detail: "English" },
    ]);
    expect(await complete(source, "<!-- [[e¦ -->")).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("uses embedded TemplateData, excludes aliases before and after the cursor, and inserts equals once", async () => {
    const load = vi.fn();
    const source = createSiteCompletionSource(profile, "zh-Hant", load);
    const result = await complete(source, "{{Info| op¦tional=x|n=Alpha}}");
    expect(result?.options.map((entry) => entry.label)).toEqual([
      "suggested",
      "other",
      "old",
    ]);
    expect(result?.to).toBe(17);
    const all = await complete(source, "{{Info|¦}}");
    expect(all?.options.map((entry) => entry.label)).toEqual([
      "name",
      "suggested",
      "other",
      "optional",
      "old",
    ]);
    expect(
      all?.options.find((entry) => entry.label === "optional"),
    ).toMatchObject({ apply: "optional=", info: "選填\nA description" });
    expect(load).not.toHaveBeenCalled();
  });

  it("completes suggested values through parameter aliases", async () => {
    const source = createSiteCompletionSource(profile, "en", vi.fn());
    expect(
      (await complete(source, "{{Info|n= B¦}}"))?.options.map(
        (entry) => entry.label,
      ),
    ).toEqual(["Alpha", "Beta"]);
  });

  it("deduplicates pending requests and caches hits, misses and failures per title", async () => {
    let resolve!: (value: SiteProfileTemplate | null) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<SiteProfileTemplate | null>((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("offline"));
    const source = createSiteCompletionSource(profile, "zh-Hans", load);
    const first = complete(source, "{{Remote|¦");
    const second = complete(source, "{{Remote|n¦");
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(profile, "Remote", "zh-hans");
    resolve(template);
    await Promise.all([first, second]);
    await complete(source, "{{Remote|¦");
    await complete(source, "{{Missing|¦");
    await complete(source, "{{Missing|n¦");
    await complete(source, "{{Offline|¦");
    await complete(source, "{{Offline|n¦");
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("does not fetch without an API or when the extension is disabled", async () => {
    const load = vi.fn();
    for (const disabled of [
      { ...profile, apiUrl: undefined },
      { ...profile, extensions: { templateData: false } },
    ]) {
      expect(
        await complete(
          createSiteCompletionSource(disabled, "en", load),
          "{{Remote|¦",
        ),
      ).toBeNull();
      expect(
        (
          await complete(
            createSiteCompletionSource(disabled, "en", load),
            "{{Info|¦",
          )
        )?.options.length,
      ).toBeGreaterThan(0);
    }
    expect(load).not.toHaveBeenCalled();
  });

  it("selects localized interface text with English and first-value fallbacks", () => {
    expect(interfaceText({ "zh-Hant": "名稱", en: "Name" }, "zh-hant")).toBe(
      "名稱",
    );
    expect(interfaceText({ fr: "Nom", en: "Name" }, "zh-hant")).toBe("Name");
    expect(interfaceText({ fr: "Nom" }, "en")).toBe("Nom");
    expect(
      parameterCompletions(template, ["name"], "en").some(
        (entry) => entry.label === "name",
      ),
    ).toBe(false);
  });
});
