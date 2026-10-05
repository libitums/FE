import type { AnswerEngineCrawler, BuildRobotsTxt } from "./seo.contract";

export const answerEngineCrawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
] as const satisfies readonly AnswerEngineCrawler[];

export const buildRobotsTxt: BuildRobotsTxt = ({ siteUrl, crawlers }) => {
  const groups = ["*", ...crawlers].map((agent) => `User-agent: ${agent}\nAllow: /`);
  const sitemap = siteUrl === "" ? [] : [`Sitemap: ${siteUrl}/sitemap-index.xml`];
  return `${[...groups, ...sitemap].join("\n\n")}\n`;
};
