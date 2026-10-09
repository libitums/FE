import type { BuildStructuredData, SerializeStructuredData } from "./seo.contract";

export const buildStructuredData: BuildStructuredData = ({
  siteUrl,
  language,
  path,
  name,
  description,
  faq,
}) => {
  if (faq.length === 0) throw new Error("buildStructuredData: faq must not be empty.");
  const url = (target: string) => (siteUrl === "" ? {} : { url: siteUrl + target });

  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name, description, inLanguage: language, ...url("/") },
      {
        "@type": "SoftwareApplication",
        name,
        description,
        applicationCategory: "EducationalApplication",
        operatingSystem: "iOS, Android",
        inLanguage: language,
        ...url(path),
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
