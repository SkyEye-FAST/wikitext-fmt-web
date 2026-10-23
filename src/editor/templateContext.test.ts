import { describe, expect, it } from "vitest";

import { COMPLETION_WINDOW, scanTemplateContext } from "./templateContext.js";

function scan(marked: string) {
  const cursor = marked.indexOf("¦");
  return scanTemplateContext(marked.replace("¦", ""), cursor);
}

describe("template context", () => {
  it("finds the innermost call and resumes the outer call after nested braces", () => {
    expect(scan("{{Outer|x={{Inner|na¦}}|y=1}}")).toMatchObject({
      title: "Inner",
      kind: "parameter",
      from: 18,
    });
    expect(scan("{{Outer|x={{Inner}}|¦}}")).toMatchObject({
      title: "Outer",
      kind: "parameter",
      used: ["x"],
    });
    expect(scan("{{Outer|x={{Inner}}}}¦")).toBeNull();
  });

  it("distinguishes names, parameters and suggested values", () => {
    expect(scan("{{  Info¦box|name=x}}")).toMatchObject({
      kind: "template",
      from: 4,
    });
    expect(scan("{{T| na¦me=x|later=y}}")).toMatchObject({
      kind: "parameter",
      from: 5,
      to: 10,
      used: ["name", "later"],
    });
    expect(scan("{{T|name=  va¦lue}}")).toMatchObject({
      kind: "value",
      from: 11,
      parameter: "name",
    });
    expect(scan("{{T|¦|second}}")?.used).toEqual(["2"]);
  });

  it("skips triple-brace parameters, comments, nowiki and link pipes", () => {
    expect(scan("{{T|x={{{arg|fallback}}}|¦}}")?.used).toEqual(["x"]);
    expect(scan("{{T|{{{ar¦g}}}}}")).toBeNull();
    expect(scan("{{T|{{{¦")).toBeNull();
    expect(scan("<!-- {{T|¦ -->")).toBeNull();
    expect(scan("{{T|<!-- ¦")).toBeNull();
    expect(scan("{{T|<nowiki>¦")).toBeNull();
    expect(scan("<nowiki>{{T|¦}}</nowiki>")).toBeNull();
    expect(scan("{{T|x=[[Page|label]]|¦}}")?.used).toEqual(["x"]);
    expect(scan("<!-- [[e¦ -->")).toBeNull();
    expect(scan("[[e¦]]")).toMatchObject({ kind: "interwiki", from: 2 });
    expect(scan("[[en:Page¦]]")).toBeNull();
  });

  it("bounds context work and keeps absolute offsets", () => {
    const prefix = "x".repeat(COMPLETION_WINDOW + 20);
    const text = `${prefix}{{T|na`;
    expect(scanTemplateContext(text, text.length)).toMatchObject({
      from: prefix.length + 4,
      kind: "parameter",
    });
    const outside = `{{T|${prefix}`;
    expect(scanTemplateContext(outside, outside.length)).toBeNull();
  });
});
