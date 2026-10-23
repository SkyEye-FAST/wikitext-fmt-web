import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatProfiles,
  getFormatProfileOverrides,
  resolveFormatProfile,
  type FormatProfile,
} from "wikitext-fmt/browser";

import { cleanup, render, screen } from "@testing-library/react";
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

function renderPanel(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  const props: Parameters<typeof SettingsPanel>[0] = {
    open: true,
    settings: createDefaultSettings({
      ...resolveFormatProfile("default"),
    } as ResolvedBrowserOptions),
    onChange: vi.fn(),
    onFormatterChange: vi.fn(),
    onClose: vi.fn(),
    onRestoreDefaults: vi.fn(),
    onReset: vi.fn(),
    profiles,
    profileOverrides,
    formatterVersion: "0.10.0",
    webVersion: "0.6.0",
    ...overrides,
  };
  render(<SettingsPanel {...props} />);
  return props;
}

afterEach(cleanup);

describe("SettingsPanel", () => {
  it("opens as a labelled dialog and exposes restore and reset actions", async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Restore default rules" }),
    );
    await user.click(screen.getByRole("button", { name: "Reset all" }));
    expect(props.onRestoreDefaults).toHaveBeenCalledOnce();
    expect(props.onReset).toHaveBeenCalledOnce();
    expect(
      screen.getByText("wikitext-fmt 0.10.0, web app 0.6.0"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Formatter engine" }),
    ).toHaveAttribute("href", expect.stringContaining("github.com"));
  });

  it("switches presets and toggles rules through labelled controls", async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByRole("radio", { name: "Default" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Complete" }));
    expect(props.onFormatterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ profile: "production" }),
    );

    const templates = screen.getByRole("switch", { name: "Format templates" });
    expect(templates).toBeChecked();
    expect(screen.getByLabelText("Line width")).toHaveValue(120);
    await user.click(templates);
    expect(props.onFormatterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ formatTemplates: false }),
    );
  });

  it("commits only valid line widths", async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    const lineWidth = screen.getByLabelText("Line width");

    await user.clear(lineWidth);
    await user.type(lineWidth, "5");
    expect(props.onFormatterChange).not.toHaveBeenCalled();
    await user.type(lineWidth, "0");
    expect(props.onFormatterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ lineWidth: 50 }),
    );
  });

  it("offers the theme choice, which is hidden from the header on phones", async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(props.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: "dark" }),
    );
  });

  it("handles typography settings (font size, font family, ligatures, features)", async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    const fontSizeInput = screen.getByLabelText("Font size");
    expect(fontSizeInput).toHaveValue(13.5);

    // Invalid font size keeps last valid value and marks aria-invalid
    await user.clear(fontSizeInput);
    await user.type(fontSizeInput, "5{enter}");
    expect(fontSizeInput).toHaveAttribute("aria-invalid", "true");
    expect(props.onChange).not.toHaveBeenCalled();

    // Valid font size commits
    await user.clear(fontSizeInput);
    await user.type(fontSizeInput, "15.5{enter}");
    expect(fontSizeInput).not.toHaveAttribute("aria-invalid");
    expect(props.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        editorFont: expect.objectContaining({ size: 15.5 }),
      }),
    );

    // Ligatures choices
    const ligaturesOn = screen.getByRole("radio", { name: "On" });
    const ligaturesOff = screen.getByRole("radio", { name: "Off" });
    const ligaturesExcept = screen.getByRole("radio", {
      name: "Except current line",
    });
    expect(ligaturesOn).toBeChecked();

    await user.click(ligaturesExcept);
    expect(props.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        editorFont: expect.objectContaining({
          ligatures: "except-current-line",
        }),
      }),
    );

    // Font features disabled when ligatures is off
    const featuresInput = screen.getByLabelText("Font features");
    expect(featuresInput).not.toBeDisabled();
    await user.click(ligaturesOff);
    expect(props.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        editorFont: expect.objectContaining({ ligatures: "off" }),
      }),
    );

    // Font family commits valid value and rejects invalid
    const fontInput = screen.getByLabelText("Font");
    await user.type(fontInput, 'invalid; {font}{enter}');
    expect(fontInput).toHaveAttribute("aria-invalid", "true");

    await user.clear(fontInput);
    await user.type(fontInput, '"Fira Code", monospace{enter}');
    expect(fontInput).not.toHaveAttribute("aria-invalid");
    expect(props.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        editorFont: expect.objectContaining({
          family: '"Fira Code", monospace',
        }),
      }),
    );
  });
});
