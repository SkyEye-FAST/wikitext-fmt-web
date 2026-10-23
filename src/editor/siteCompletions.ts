import type {
  InterfaceText,
  SiteProfile,
  SiteProfileTemplate,
} from "wikitext-fmt/browser";

import type { Completion, CompletionSource } from "@codemirror/autocomplete";

import { COMPLETION_WINDOW, scanTemplateContext } from "./templateContext.js";

export function interfaceText(
  value: InterfaceText | undefined,
  language: string,
): string {
  if (typeof value === "string") return value;
  return (
    Object.entries(value ?? {}).find(
      ([key]) => key.toLowerCase() === language.toLowerCase(),
    )?.[1] ??
    value?.en ??
    Object.values(value ?? {})[0] ??
    ""
  );
}

export function templateDataLanguage(
  locale: string,
): "en" | "zh-hans" | "zh-hant" {
  return locale === "zh-Hans"
    ? "zh-hans"
    : locale === "zh-Hant"
      ? "zh-hant"
      : "en";
}

function titleKey(title: string): string {
  const name = title.replaceAll("_", " ").trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function parameterCompletions(
  template: SiteProfileTemplate,
  used: string[],
  language: string,
): Completion[] {
  const order = template.paramOrder ?? [];
  const deprecated = (value: boolean | string | undefined) =>
    typeof value === "string" || value === true;
  return Object.entries(template.params ?? {})
    .filter(
      ([name, parameter]) =>
        ![name, ...(parameter.aliases ?? [])].some((alias) =>
          used.includes(alias),
        ),
    )
    .sort(
      ([a, pa], [b, pb]) =>
        Number(deprecated(pa.deprecated)) - Number(deprecated(pb.deprecated)) ||
        Number(Boolean(pb.required)) - Number(Boolean(pa.required)) ||
        Number(Boolean(pb.suggested)) - Number(Boolean(pa.suggested)) ||
        (order.includes(a) ? order.indexOf(a) : Infinity) -
          (order.includes(b) ? order.indexOf(b) : Infinity),
    )
    .map(([name, parameter], index) => ({
      label: name,
      apply: `${name}=`,
      type: "property",
      boost: -index,
      info: [
        interfaceText(parameter.label, language),
        interfaceText(parameter.description, language),
      ]
        .filter(Boolean)
        .join("\n"),
    }));
}

export type TemplateDataLoader = (
  profile: SiteProfile,
  title: string,
  language: "en" | "zh-hans" | "zh-hant",
) => Promise<SiteProfileTemplate | null>;

/** One source per profile/language. Cache promises as well as hits and misses,
 * so typing while a request is pending does not start another request. */
export function createSiteCompletionSource(
  profile: SiteProfile,
  locale: string,
  load: TemplateDataLoader,
): CompletionSource {
  const language = templateDataLanguage(locale);
  const cache = new Map<string, Promise<SiteProfileTemplate | null>>();
  const templates = new Map(
    Object.entries(profile.templates ?? {}).map(([title, data]) => [
      titleKey(title),
      data,
    ]),
  );
  return async (context) => {
    const start = Math.max(0, context.pos - COMPLETION_WINDOW);
    const text = context.state.sliceDoc(
      start,
      Math.min(context.state.doc.length, context.pos + COMPLETION_WINDOW),
    );
    const cursor = context.pos - start;
    const call = scanTemplateContext(text, cursor);
    if (!call) return null;
    const from = start + call.from;
    if (call.kind === "interwiki")
      return {
        from,
        options: (profile.interwiki ?? []).map((entry) => ({
          label: entry.prefix,
          apply: `${entry.prefix}:`,
          detail: entry.language ?? entry.url,
          type: "namespace",
        })),
        validFor: /^[^[\]|:\n]*$/u,
      };
    if (call.kind === "template")
      return {
        from,
        options: Object.entries(profile.templates ?? {}).map(
          ([title, data]) => ({
            label: title,
            type: "class",
            info: interfaceText(data.description, language),
          }),
        ),
        validFor: /^[^{}|\n]*$/u,
      };
    const key = titleKey(call.title);
    let template = templates.get(key) ?? null;
    if (!template && profile.apiUrl && profile.extensions.templateData) {
      let pending = cache.get(key);
      if (!pending) {
        pending = load(profile, call.title, language).catch(() => null);
        cache.set(key, pending);
      }
      template = await pending;
    }
    if (!template || context.aborted) return null;
    if (call.kind === "parameter")
      return {
        from,
        to: call.to === undefined ? undefined : start + call.to,
        options: parameterCompletions(template, call.used, language),
        filter: true,
      };
    const parameter = Object.entries(template.params ?? {}).find(
      ([name, data]) =>
        name === call.parameter || data.aliases?.includes(call.parameter ?? ""),
    )?.[1];
    return {
      from,
      options: (parameter?.suggestedvalues ?? []).map((value) => ({
        label: value,
        type: "constant",
      })),
      validFor: /^[^|{}\n]*$/u,
    };
  };
}
