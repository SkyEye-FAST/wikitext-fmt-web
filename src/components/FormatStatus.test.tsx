import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";

import { FormatStatus } from "./FormatStatus.js";

describe("FormatStatus", () => {
  it("displays the package-derived web and formatter versions", () => {
    render(
      <FormatStatus
        status={{ kind: "idle" }}
        profile="default"
        webVersion="0.3.0"
        formatterVersion="0.8.1"
      />,
    );

    expect(screen.getByText(/Web/).parentElement).toHaveTextContent(
      "Web 0.3.0 · Formatter 0.8.1",
    );
  });
});
