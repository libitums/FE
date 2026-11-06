import type { BuildStructuredData, SerializeStructuredData } from "./seo.contract";

export const buildStructuredData: BuildStructuredData = ({
  siteUrl,
  language,
  path,
  name,
  alternateNames,
  logoPath,
  sameAs,
  description,
  faq,
}) => {
  if (faq.length === 0) throw new Error("buildStructuredData: faq must not be empty.");
  if (!logoPath.startsWith("/")) {
    throw new Error(`buildStructuredData: logoPath "${logoPath}" must start with "/".`);
  }
  for (const link of sameAs) {
    if (!link.startsWith("https://")) {
      throw new Error(`buildStructuredData: sameAs "${link}" must be an https:// address.`);
    }
  }
  const url = (target: string) => (siteUrl === "" ? {} : { url: siteUrl + target });
  const logo = siteUrl === "" ? {} : { logo: siteUrl + logoPath };
  const alternate = alternateNames.length === 0 ? {} : { alternateName: alternateNames };
  const same = sameAs.length === 0 ? {} : { sameAs };

  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name, ...alternate, description, inLanguage: language, ...url("/") },
      { "@type": "Organization", name, ...alternate, ...url("/"), ...logo, ...same },
      {
        "@type": "SoftwareApplication",
        name,
        ...alternate,
        description,
        applicationCategory: "EducationalApplication",
        operatingSystem: "iOS, Android",
        inLanguage: language,
        ...url(path),
        ...same,
      },
      {
        "@type": "FAQPage",
        inLanguage: language,
        ...url(path),
        mainEntity: faq.map((entry) => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: entry.answer },
        })),
      },
    ],
  };
};

export const serializeStructuredData: SerializeStructuredData = (data) =>
  JSON.stringify(data).replaceAll("<", "\\u003c");
