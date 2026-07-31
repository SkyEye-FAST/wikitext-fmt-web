import { defaultOptions } from "wikitext-fmt/browser";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { createDefaultSettings } from "../settings/schema.js";
import SettingsPanel from "./SettingsPanel.js";

describe("SettingsPanel", () => {
  it("exposes restore and reset settings actions", async () => {
    const user = userEvent.setup();
    const onRestoreDefaults = vi.fn();
    const onReset = vi.fn();
    render(
      <SettingsPanel
        settings={createDefaultSettings({ ...defaultOptions } as ResolvedBrowserOptions)}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onRestoreDefaults={onRestoreDefaults}
        onReset={onReset}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Restore core defaults" }));
    await user.click(screen.getByRole("button", { name: "Reset settings" }));
    expect(onRestoreDefaults).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByText("MediaWiki bundled browser configuration")).toBeInTheDocument();
  });
});
