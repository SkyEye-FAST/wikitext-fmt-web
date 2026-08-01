import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormatStatus } from "./FormatStatus.js";

describe("FormatStatus", () => {
  it("displays the package-derived web and formatter versions", () => {
    render(
      <FormatStatus
        status={{ kind: "idle" }}
        profile="default"
        webVersion="0.1.0"
        formatterVersion="0.6.0"
      />,
    );

    expect(screen.getByText(/Web/).parentElement).toHaveTextContent("Web 0.1.0 · Formatter 0.6.0");
  });
});
