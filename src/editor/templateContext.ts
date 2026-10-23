export const COMPLETION_WINDOW = 16384;

interface Call {
  start: number;
  end: number;
  parts: { start: number; equals?: number; end: number }[];
}

export interface TemplateContext {
  title: string;
  kind: "template" | "parameter" | "value" | "interwiki";
  from: number;
  to?: number;
  parameter?: string;
  used: string[];
}

/** Bound work on large documents. Delimiters inside nested calls, parameters,
 * links, comments and nowiki do not belong to the surrounding template. */
export function scanTemplateContext(
  text: string,
  cursor: number,
): TemplateContext | null {
  const offset = Math.max(0, cursor - COMPLETION_WINDOW);
  const limit = Math.min(text.length, cursor + COMPLETION_WINDOW);
  const calls: Call[] = [];
  const stack: {
    kind: "template" | "argument" | "link";
    start: number;
    call?: Call;
  }[] = [];
  const links: { start: number; end: number }[] = [];
  let blocked = false;
  for (let i = offset; i < limit;) {
    const comment = text.startsWith("<!--", i);
    const nowiki =
      text[i] === "<"
        ? /^<nowiki\b[^>]*>/i.exec(text.slice(i, Math.min(i + 256, limit)))
        : null;
    if (comment || nowiki) {
      const startLength = comment ? 4 : nowiki![0].length;
      const selfClosing = !comment && /\/\s*>$/.test(nowiki![0]);
      const remainder = text.slice(i + startLength, limit);
      const relativeEnd = comment
        ? remainder.indexOf("-->")
        : remainder.toLowerCase().indexOf("</nowiki>");
      const end = selfClosing
        ? i + startLength
        : relativeEnd < 0
          ? -1
          : i + startLength + relativeEnd;
      const next = selfClosing
        ? end
        : end < 0
          ? limit
          : end + (comment ? 3 : 9);
      if (i < cursor && (cursor < next || (end < 0 && cursor === next)))
        blocked = true;
      i = Math.min(next, limit);
      continue;
    }
    if (text.startsWith("{{{", i)) {
      stack.push({ kind: "argument", start: i });
      i += 3;
      continue;
    }
    if (text.startsWith("{{", i)) {
      const call: Call = {
        start: i,
        end: limit,
        parts: [{ start: i + 2, end: limit }],
      };
      calls.push(call);
      stack.push({ kind: "template", start: i, call });
      i += 2;
      continue;
    }
    const top = stack.at(-1);
    if (text.startsWith("}}", i) && top && top.kind !== "link") {
      const width = top.kind === "argument" ? 3 : 2;
      if (text.startsWith("}".repeat(width), i)) {
        if (top.kind === "argument" && top.start < cursor && cursor <= i)
          blocked = true;
        if (top.call) {
          top.call.end = i;
          top.call.parts.at(-1)!.end = i;
        }
        stack.pop();
        i += width;
        continue;
      }
    }
    if (text.startsWith("[[", i)) {
      stack.push({ kind: "link", start: i });
      i += 2;
      continue;
    }
    if (text.startsWith("]]", i) && top?.kind === "link") {
      links.push({ start: top.start, end: i });
      stack.pop();
      i += 2;
      continue;
    }
    if (i === cursor && top?.kind === "argument") blocked = true;
    if (top?.call) {
      const part = top.call.parts.at(-1)!;
      if (text[i] === "|") {
        part.end = i;
        top.call.parts.push({ start: i + 1, end: limit });
      } else if (text[i] === "=" && part.equals === undefined) part.equals = i;
    }
    i++;
  }
  if (
    blocked ||
    stack.some((frame) => frame.kind === "argument" && frame.start < cursor)
  )
    return null;
  for (const frame of stack)
    if (frame.kind === "link") links.push({ start: frame.start, end: limit });
  const link = links
    .reverse()
    .find((entry) => entry.start + 2 <= cursor && cursor <= entry.end);
  if (link && /^[^[\]|:\n]*$/u.test(text.slice(link.start + 2, cursor)))
    return { title: "", kind: "interwiki", from: link.start + 2, used: [] };
  // Search backwards from the cursor for the innermost still-open call.
  const call = calls
    .reverse()
    .find((entry) => entry.start + 2 <= cursor && entry.end >= cursor);
  if (!call) return null;
  if (link && link.start > call.start) return null;
  const partIndex = call.parts.findIndex(
    (part) => part.start <= cursor && cursor <= part.end,
  );
  if (partIndex < 0) return null;
  const part = call.parts[partIndex]!;
  const title = text
    .slice(call.start + 2, call.parts[0]!.end)
    .trim()
    .replaceAll("_", " ");
  const used: string[] = [];
  let positional = 0;
  for (const parameter of call.parts.slice(1)) {
    if (parameter.equals !== undefined)
      used.push(text.slice(parameter.start, parameter.equals).trim());
    else {
      positional++;
      if (parameter !== part) used.push(String(positional));
    }
  }
  const from =
    part.start +
    (text.slice(part.start, cursor).match(/^\s*/u)?.[0].length ?? 0);
  if (partIndex === 0) return { title, kind: "template", from, used };
  if (!title || /[{}|\r\n#<>[\]]/u.test(title)) return null;
  if (part.equals === undefined || cursor <= part.equals)
    return {
      title,
      kind: "parameter",
      from,
      to: part.equals === undefined ? undefined : part.equals + 1,
      used,
    };
  const valueStart = part.equals + 1;
  return {
    title,
    kind: "value",
    from:
      valueStart +
      (text.slice(valueStart, cursor).match(/^\s*/u)?.[0].length ?? 0),
    parameter: text.slice(part.start, part.equals).trim(),
    used,
  };
}
