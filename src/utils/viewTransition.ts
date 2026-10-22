import { flushSync } from "react-dom";

/**
 * Applies a state update that repaints the whole page, such as a theme or
 * language switch, as a short crossfade where the browser supports it.
 */
export function withViewTransition(update: () => void): void {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  document.startViewTransition(() => {
    flushSync(update);
  });
}
