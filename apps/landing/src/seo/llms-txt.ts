import type { BuildLlmsTxt } from "./seo.contract";

const printableAscii = /^[\x20-\x7e]+$/;

export const buildLlmsTxt: BuildLlmsTxt = ({
  siteUrl,
  name,
  summary,
  alsoKnownAs,
  links,
  pages,
  faq,
}) => {
  if (/[\r\n]/.test(summary)) throw new Error("buildLlmsTxt: summary must be a single line.");
  if (pages.length === 0) throw new Error("buildLlmsTxt: pages must not be empty.");
  if (faq.length === 0) throw new Error("buildLlmsTxt: faq must not be empty.");
  for (const alias of alsoKnownAs) {
    if (!printableAscii.test(alias)) {
      throw new Error(`buildLlmsTxt: alsoKnownAs "${alias}" must be printable ASCII.`);
    }
  }
  for (const link of links) {
    if (!link.url.startsWith("https://")) {
      throw new Error(`buildLlmsTxt: link "${link.url}" must be an https:// address.`);
    }
  }

  const pageLinks = pages.map((page) => `- [${page.title}](${siteUrl + page.path}): ${page.label}`);
  const officialLinks = links.map((link) => `- [${link.label}](${link.url})`);
  const entries = faq.map((entry) => `### ${entry.question}\n\n${entry.answer}`);

  const blocks = [
    `# ${name}`,
    `> ${summary}`,
    ...(alsoKnownAs.length === 0 ? [] : [`Also known as: ${alsoKnownAs.join(", ")}.`]),
    `## Pages\n\n${pageLinks.join("\n")}`,
    ...(links.length === 0 ? [] : [`## Official links\n\n${officialLinks.join("\n")}`]),
    `## FAQ\n\n${entries.join("\n\n")}`,
  ];
  return `${blocks.join("\n\n")}\n`;
};
