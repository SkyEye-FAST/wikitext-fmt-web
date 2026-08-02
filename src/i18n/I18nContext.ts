import { createContext } from "react";

import type { I18n } from "./useI18n.js";

export const I18nContext = createContext<I18n | null>(null);
