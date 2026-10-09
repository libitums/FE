import type { BuildLlmsTxt } from "./seo.contract";

export const buildLlmsTxt: BuildLlmsTxt = ({ siteUrl, name, summary, pages, faq }) => {
  if (/[\r\n]/.test(summary)) throw new Error("buildLlmsTxt: summary must be a single line.");
  if (pages.length === 0) throw new Error("buildLlmsTxt: pages must not be empty.");
  if (faq.length === 0) throw new Error("buildLlmsTxt: faq must not be empty.");

  const links = pages.map((page) => `- [${page.title}](${siteUrl + page.path}): ${page.label}`);
  const entries = faq.map((entry) => `### ${entry.question}\n\n${entry.answer}`);

  const blocks = [
    `# ${name}`,
    `> ${summary}`,
    `## Pages\n\n${links.join("\n")}`,
    `## FAQ\n\n${entries.join("\n\n")}`,
  ];
  return `${blocks.join("\n\n")}\n`;
};
