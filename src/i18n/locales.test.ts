import { describe, expect, it } from "vitest";
import { detectBrowserLocale, isLanguagePreference, isSupportedLocale, resolveBrowserLocale, resolveLocale } from "./locales.js";

describe("locale resolution", () => {
  it.each([
    ["zh-CN", "zh-Hans"],
    ["zh-cn", "zh-Hans"],
    ["zh_SG", "zh-Hans"],
    ["zh-MY", "zh-Hans"],
    ["zh-Hans", "zh-Hans"],
    ["zh-hans", "zh-Hans"],
    ["zh-Hans-CN", "zh-Hans"],
    ["zh-TW", "zh-Hant"],
    ["zh-tw", "zh-Hant"],
    ["zh_HK", "zh-Hant"],
    ["zh-MO", "zh-Hant"],
    ["zh-Hant", "zh-Hant"],
    ["zh-Hant-TW", "zh-Hant"],
    ["en", "en"],
    ["en-US", "en"],
    ["EN_us", "en"],
    ["fr", "en"],
    ["ja", "en"],
    ["de", "en"],
  ])("resolves %s to %s", (input, expected) => {
    expect(resolveBrowserLocale(input)).toBe(expected);
  });

  it("honors navigator language priority, including English", () => {
    expect(detectBrowserLocale({ languages: ["en-US", "zh-TW"] })).toBe("en");
    expect(
      detectBrowserLocale({ languages: ["fr", "zh-TW"] }),
    ).toBe("zh-Hant");
    expect(
      detectBrowserLocale({ languages: ["de", "zh-CN"] }),
    ).toBe("zh-Hans");
    expect(
      detectBrowserLocale({ languages: ["ja", "en-GB"] }),
    ).toBe("en");
    expect(detectBrowserLocale({ languages: ["fr", "de"] })).toBe("en");
  });

  it("falls back to navigator.language when languages is empty", () => {
    expect(
      detectBrowserLocale({ language: "zh-HK" }),
    ).toBe("zh-Hant");
    expect(
      detectBrowserLocale({ language: "fr" }),
    ).toBe("en");
  });

  it("returns en when no language information is available", () => {
    expect(detectBrowserLocale({})).toBe("en");
  });

  it("respects manual language selection over browser language", () => {
    const nav = { languages: ["zh-TW"] };
    expect(resolveLocale("en", nav)).toBe("en");
    expect(resolveLocale("zh-Hans", nav)).toBe("zh-Hans");
  });

  it('follows browser language when preference is "system"', () => {
    expect(resolveLocale("system", { languages: ["zh-CN"] })).toBe("zh-Hans");
    expect(resolveLocale("system", { languages: ["zh-TW"] })).toBe("zh-Hant");
    expect(resolveLocale("system", { languages: ["en"] })).toBe("en");
  });

  it("validates supported locale and language preference guards", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("zh-Hans")).toBe(true);
    expect(isSupportedLocale("zh-Hant")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
    expect(isSupportedLocale("system")).toBe(false);

    expect(isLanguagePreference("system")).toBe(true);
    expect(isLanguagePreference("en")).toBe(true);
    expect(isLanguagePreference("zh-Hans")).toBe(true);
    expect(isLanguagePreference("zh-Hant")).toBe(true);
    expect(isLanguagePreference("fr")).toBe(false);
  });
});
