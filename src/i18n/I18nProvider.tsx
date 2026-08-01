import { type ReactNode, useMemo } from "react";
import type { MessageCatalog } from "./messages.en.js";
import { enMessages } from "./messages.en.js";
import { messages as zhHansMessages } from "./messages.zh-Hans.js";
import { messages as zhHantMessages } from "./messages.zh-Hant.js";
import type { SupportedLocale } from "./locales.js";
import { htmlLang } from "./locales.js";
import { I18nContext } from "./I18nContext.js";
import { createT, type I18n } from "./useI18n.js";

const catalogs: Record<SupportedLocale, MessageCatalog> = {
  en: enMessages,
  "zh-Hans": zhHansMessages,
  "zh-Hant": zhHantMessages,
};

interface I18nProviderProps {
  locale: SupportedLocale;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const value = useMemo<I18n>(() => {
    const messages = catalogs[locale] ?? enMessages;
    return {
      locale,
      t: createT(messages),
      htmlLang: htmlLang(locale),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
