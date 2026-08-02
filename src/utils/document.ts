export interface DocumentStatistics {
  characters: number;
  lines: number;
}

export function getDocumentStatistics(text: string): DocumentStatistics {
  return {
    characters: text.length,
    lines: text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length,
  };
}

export function buildDownloadFilename(sourceFilename?: string): string {
  if (!sourceFilename) {
    return "Article.formatted.wikitext";
  }
  const match = /^(.*?)(\.[^.]+)?$/.exec(sourceFilename);
  const stem = match?.[1] || "Article";
  const extension = match?.[2] || ".wikitext";
  return `${stem}.formatted${extension}`;
}

export function createTextDownload(text: string, sourceFilename?: string) {
  return {
    blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
    filename: buildDownloadFilename(sourceFilename),
  };
}

export async function copyText(
  text: string,
  clipboard: Pick<Clipboard, "writeText"> = navigator.clipboard,
): Promise<void> {
  await clipboard.writeText(text);
}

export function triggerTextDownload(
  text: string,
  sourceFilename?: string,
): void {
  const { blob, filename } = createTextDownload(text, sourceFilename);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
