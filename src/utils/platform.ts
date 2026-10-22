interface NavigatorLike {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
}

export function isApplePlatform(
  nav: NavigatorLike = navigator as NavigatorLike,
): boolean {
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/iu.test(platform || nav.userAgent || "");
}

export interface ShortcutLabels {
  /** Readable label, e.g. "Ctrl+Enter" or "⌘↵". */
  format: string;
  undo: string;
  paste: string;
  /** Value for aria-keyshortcuts. */
  formatAria: string;
}

export function getShortcutLabels(apple = isApplePlatform()): ShortcutLabels {
  return apple
    ? {
        format: "⌘↵",
        undo: "⌘Z",
        paste: "⌘V",
        formatAria: "Meta+Enter",
      }
    : {
        format: "Ctrl+Enter",
        undo: "Ctrl+Z",
        paste: "Ctrl+V",
        formatAria: "Control+Enter",
      };
}
