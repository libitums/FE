import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "./llms-txt";
import type { LlmsTxtInput } from "./seo.contract";

const base: LlmsTxtInput = {
  siteUrl: "",
  name: "Duru",
  summary: "Duru is a story-based Korean learning app.",
  pages: [
    { title: "Duru — Korean, lived as a story", label: "English", path: "/" },
    { title: "Duru — 이야기로 살아보는 한국어", label: "한국어", path: "/ko/" },
  ],
  faq: [
    { id: "what", question: "What is Duru?", answer: "A story-based Korean app." },
    { id: "who", question: "Who is Duru for?", answer: "People starting Korean." },
    { id: "where", question: "Where can I get it?", answer: "Not released yet." },
  ],
};

const input = (overrides: Partial<LlmsTxtInput> = {}): LlmsTxtInput => ({ ...base, ...overrides });

describe("buildLlmsTxt", () => {
  it("U-LL1 첫 줄은 # 이름", () => {
    expect(buildLlmsTxt(input()).split("\n")[0]).toBe("# Duru");
  });

  it("U-LL2 둘째 덩어리는 > 요약 한 줄", () => {
    const blocks = buildLlmsTxt(input()).split("\n\n");
    expect(blocks[1]).toBe("> Duru is a story-based Korean learning app.");
  });

  it("U-LL3 주소가 없으면 상대 링크, 순서 유지", () => {
    const text = buildLlmsTxt(input());
    const lines = text.split("\n");
    const start = lines.indexOf("## Pages");
    expect(start).toBeGreaterThan(-1);
    expect(lines[start + 2]).toBe("- [Duru — Korean, lived as a story](/): English");
    expect(lines[start + 3]).toBe("- [Duru — 이야기로 살아보는 한국어](/ko/): 한국어");
  });

  it("U-LL4 주소가 있으면 절대 링크", () => {
    const text = buildLlmsTxt(input({ siteUrl: "https://example.test" }));
    expect(text).toContain("](https://example.test/): English");
    expect(text).toContain("](https://example.test/ko/): 한국어");
  });

  it("U-LL5 FAQ는 ### 질문 + 빈 줄 + 답, 순서 유지, 전부", () => {
    const lines = buildLlmsTxt(input()).split("\n");
    const start = lines.indexOf("## FAQ");
    expect(start).toBeGreaterThan(-1);
    const tail = lines.slice(start + 2);
    expect(tail.slice(0, 3)).toEqual(["### What is Duru?", "", "A story-based Korean app."]);
    expect(tail.slice(4, 7)).toEqual(["### Who is Duru for?", "", "People starting Korean."]);
    expect(tail.slice(8, 11)).toEqual(["### Where can I get it?", "", "Not released yet."]);
  });

  it("U-LL6 줄 끝 규칙", () => {
    const text = buildLlmsTxt(input());
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(text).not.toContain("\n\n\n");
    expect(text).not.toContain("\r");
  });

  it("U-LL7 전체 문자열", () => {
    const text = buildLlmsTxt(input({ siteUrl: "https://example.test" }));
    expect(text).toBe(
      [
        "# Duru",
        "",
        "> Duru is a story-based Korean learning app.",
        "",
        "## Pages",
        "",
        "- [Duru — Korean, lived as a story](https://example.test/): English",
        "- [Duru — 이야기로 살아보는 한국어](https://example.test/ko/): 한국어",
        "",
        "## FAQ",
        "",
        "### What is Duru?",
        "",
        "A story-based Korean app.",
        "",
        "### Who is Duru for?",
        "",
        "People starting Korean.",
        "",
        "### Where can I get it?",
        "",
        "Not released yet.",
        "",
      ].join("\n"),
    );
  });

  it("U-LL8 잘못된 입력은 던진다", () => {
    expect(buildLlmsTxt(input()).startsWith("# Duru\n")).toBe(true);
    expect(() => buildLlmsTxt(input({ summary: "a\nb" }))).toThrow(/\S/);
    expect(() => buildLlmsTxt(input({ pages: [] }))).toThrow(/\S/);
    expect(() => buildLlmsTxt(input({ faq: [] }))).toThrow(/\S/);
  });
});
