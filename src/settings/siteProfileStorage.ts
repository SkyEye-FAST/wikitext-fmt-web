import type {
  LoadedSiteProfile,
  SiteProfileInput,
} from "../formatter/protocol.js";
import {
  FormatterClientError,
  WorkerStoppedError,
} from "../formatter/client.js";

export const SITE_PROFILE_STORAGE_KEY = "wikitext-formatter.site-profile";

export function saveSiteProfile(
  serialized: string | null,
  storage: Pick<Storage, "setItem" | "removeItem"> = localStorage,
): void {
  try {
    if (serialized === null) storage.removeItem(SITE_PROFILE_STORAGE_KEY);
    else storage.setItem(SITE_PROFILE_STORAGE_KEY, serialized);
  } catch {
    /* Storage may be unavailable or full. */
  }
}

export async function restoreSiteProfile(
  load: (input: SiteProfileInput) => Promise<LoadedSiteProfile>,
  storage: Pick<Storage, "getItem" | "removeItem"> = localStorage,
): Promise<LoadedSiteProfile | null> {
  try {
    const json = storage.getItem(SITE_PROFILE_STORAGE_KEY);
    if (!json) return null;
    try {
      return await load({ json });
    } catch (error) {
      if (
        error instanceof WorkerStoppedError ||
        (error instanceof FormatterClientError &&
          error.code !== "request-rejected")
      )
        return null;
      storage.removeItem(SITE_PROFILE_STORAGE_KEY);
    }
  } catch {
    /* A stored profile is optional. */
  }
  return null;
}
