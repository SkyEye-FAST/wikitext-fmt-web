import { describe, expect, it, vi } from "vitest";
import {
  formatProfiles,
  getFormatProfileOverrides,
  resolveFormatProfile,
  type FormatProfile,
} from "wikitext-fmt/browser";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ResolvedBrowserOptions } from "../formatter/protocol.js";
import { createDefaultSettings } from "../settings/schema.js";
import SettingsPanel from "./SettingsPanel.js";

const profiles = Object.fromEntries(
  formatProfiles.map((profile) => [profile, resolveFormatProfile(profile)]),
) as Record<FormatProfile, ResolvedBrowserOptions>;
const profileOverrides = Object.fromEntries(
  formatProfiles.map((profile) => [
    profile,
    getFormatProfileOverrides(profile),
  ]),
) as Parameters<typeof SettingsPanel>[0]["profileOverrides"];

describe("SettingsPanel", () => {
  it("exposes restore and reset settings actions", async () => {
    const user = userEvent.setup();
    const onRestoreDefaults = vi.fn();
    const onReset = vi.fn();
    render(
      <SettingsPanel
        settings={createDefaultSettings({
          ...resolveFormatProfile("default"),
        } as ResolvedBrowserOptions)}
        onChange={vi.fn()}
        onFormatterChange={vi.fn()}
        onClose={vi.fn()}
        onRestoreDefaults={onRestoreDefaults}
        onReset={onReset}
        profiles={profiles}
        profileOverrides={profileOverrides}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Restore core defaults" }),
    );
    await user.click(screen.getByRole("button", { name: "Reset settings" }));
    expect(onRestoreDefaults).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
    expect(
      screen.getByText("MediaWiki bundled browser configuration"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Aggressive" })).toBeNull();
  });
});
