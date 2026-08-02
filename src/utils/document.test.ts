import { describe, expect, it, vi } from "vitest";

import {
  buildDownloadFilename,
  copyText,
  createTextDownload,
  getDocumentStatistics,
} from "./document.js";

describe("document helpers", () => {
  it("counts CRLF and empty documents correctly", () => {
    expect(getDocumentStatistics("")).toEqual({ characters: 0, lines: 0 });
    expect(getDocumentStatistics("a\r\nb\n")).toEqual({
      characters: 5,
      lines: 3,
    });
  });

  it("preserves source filenames for downloads", () => {
    expect(buildDownloadFilename("Article.wiki")).toBe(
      "Article.formatted.wiki",
    );
    expect(buildDownloadFilename()).toBe("Article.formatted.wikitext");
    expect(createTextDownload("text", "A.txt").blob.type).toBe(
      "text/plain;charset=utf-8",
    );
  });

  it("copies output through the supplied clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await copyText("formatted", { writeText });
    expect(writeText).toHaveBeenCalledWith("formatted");
  });
});
