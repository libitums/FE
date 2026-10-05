import { describe, expect, it } from "vitest";
import { answerEngineCrawlers, buildRobotsTxt } from "./robots-txt";
import type { AnswerEngineCrawler } from "./seo.contract";

interface Group {
  agents: string[];
  rules: string[];
}

// User-agent 줄들 + 규칙 줄들을 묶음으로 나눕니다. Sitemap 줄은 묶음에 넣지 않습니다.
const parse = (text: string): Group[] => {
  const groups: Group[] = [];
  let current: Group | undefined;
  for (const line of text.split("\n")) {
    if (line.trim() === "" || line.startsWith("Sitemap:")) {
      current = undefined;
      continue;
    }
    if (line.startsWith("User-agent:")) {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(line.slice("User-agent:".length).trim());
    } else if (current) {
      current.rules.push(line.trim());
    }
  }
  return groups;
};

const build = (siteUrl: string, crawlers: readonly AnswerEngineCrawler[] = answerEngineCrawlers) =>
  buildRobotsTxt({ siteUrl, crawlers });

describe("robots-txt", () => {
  it("U-RB1 수집기 여섯, 계약 순서", () => {
    expect([...answerEngineCrawlers]).toEqual([
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
    ]);
  });

  it("U-RB2 첫 묶음은 * 와 Allow: /", () => {
    const groups = parse(build(""));
    expect(groups[0]).toEqual({ agents: ["*"], rules: ["Allow: /"] });
  });

  it("U-RB3 수집기마다 묶음 하나, 규칙은 Allow: / 하나", () => {
    const groups = parse(build("")).slice(1);
    expect(groups).toHaveLength(answerEngineCrawlers.length);
    groups.forEach((group, index) => {
      expect(group).toEqual({ agents: [answerEngineCrawlers[index]], rules: ["Allow: /"] });
    });
  });

  it("U-RB4 Disallow가 없다", () => {
    expect(build("")).not.toContain("Disallow");
    expect(build("https://example.test")).not.toContain("Disallow");
  });

  it("U-RB5 주소가 없으면 Sitemap이 없다", () => {
    expect(build("")).not.toContain("Sitemap");
  });

  it("U-RB6 주소가 있으면 마지막 줄이 Sitemap", () => {
    const lines = build("https://example.test")
      .split("\n")
      .filter((line) => line.trim() !== "");
    expect(lines.at(-1)).toBe("Sitemap: https://example.test/sitemap-index.xml");
  });

  it("U-RB7 crawlers가 비면 * 묶음만 남는다", () => {
    const text = build("https://example.test", []);
    expect(parse(text)).toEqual([{ agents: ["*"], rules: ["Allow: /"] }]);
    expect(text).toContain("Sitemap: https://example.test/sitemap-index.xml");
  });

  it("U-RB8 \\n으로 끝난다", () => {
    expect(build("").endsWith("\n")).toBe(true);
    expect(build("https://example.test").endsWith("\n")).toBe(true);
  });
});
