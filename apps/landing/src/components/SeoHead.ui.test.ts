import { describe, expect, it } from "vitest";
import { buildFaq } from "../seo/faq";
import { buildHeadMeta } from "../seo/head-meta";
import { buildStructuredData } from "../seo/structured-data";
import { defaultLanguage, languageRoutes, pages, siteName, type Language } from "../site";
import { jsonLd, render } from "./render.support";
import SeoHead from "./SeoHead.astro";

const SITE = "https://example.test";
const faq = buildFaq({ copy: pages.en.copy, storeAvailability: "coming-soon" });

const renderHead = (language: Language, siteUrl: string) =>
  render(SeoHead, { props: { language, siteUrl, faq } });

const metaContent = (document: Document, selector: string) =>
  [...document.querySelectorAll(selector)].map((node) => node.getAttribute("content"));

const one = (document: Document, selector: string): string | null => {
  const found = document.querySelectorAll(selector);
  expect(found).toHaveLength(1);
  return found[0]?.getAttribute("content") ?? null;
};

describe("SeoHead", () => {
  it("UI-SH1 주소 없음: 절대 주소가 필요한 태그가 없다", async () => {
    for (const language of ["en", "ko"] as const) {
      const { document } = await renderHead(language, "");
      // 껍데기가 아무것도 내지 않아도 공허하게 통과하지 않도록, 있어야 하는 것을 먼저 본다.
      expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
      expect(document.querySelectorAll("link[rel=canonical]")).toHaveLength(0);
      expect(document.querySelectorAll("link[hreflang]")).toHaveLength(0);
      for (const property of [
        "og:url",
        "og:image",
        "og:image:width",
        "og:image:height",
        "og:image:alt",
      ]) {
        expect(document.querySelectorAll(`meta[property="${property}"]`)).toHaveLength(0);
      }
      for (const name of ["twitter:image", "twitter:image:alt"]) {
        expect(document.querySelectorAll(`meta[name="${name}"]`)).toHaveLength(0);
      }
    }
  });

  it("UI-SH2 주소 없음에도 있는 것", async () => {
    for (const language of ["en", "ko"] as const) {
      const page = pages[language];
      const { document } = await renderHead(language, "");
      expect(one(document, 'meta[property="og:title"]')).toBe(page.title);
      expect(one(document, 'meta[property="og:description"]')).toBe(page.description);
      expect(one(document, 'meta[property="og:locale"]')).toBe(page.locale);
      expect(one(document, 'meta[property="og:site_name"]')).toBe(siteName);
      expect(one(document, 'meta[name="twitter:card"]')).toBe("summary_large_image");
      expect(one(document, 'meta[name="twitter:title"]')).toBe(page.title);
      expect(one(document, 'meta[name="twitter:description"]')).toBe(page.description);
    }
  });

  it("UI-SH3 og:locale:alternate", async () => {
    const en = await renderHead("en", "");
    expect(metaContent(en.document, 'meta[property="og:locale:alternate"]')).toEqual(["ko_KR"]);
    const ko = await renderHead("ko", "");
    expect(metaContent(ko.document, 'meta[property="og:locale:alternate"]')).toEqual(["en_US"]);
  });

  it("UI-SH4 주소 있음: canonical · og:url", async () => {
    for (const language of ["en", "ko"] as const) {
      const { absolute } = buildHeadMeta({
        siteUrl: SITE,
        language,
        routes: languageRoutes,
        imagePath: pages[language].image,
      });
      const { document } = await renderHead(language, SITE);
      const canonicals = document.querySelectorAll("link[rel=canonical]");
      expect(canonicals).toHaveLength(1);
      expect(canonicals[0]?.getAttribute("href")).toBe(absolute?.canonical);
      expect(one(document, 'meta[property="og:url"]')).toBe(absolute?.canonical);
    }
  });

  it("UI-SH5 주소 있음: hreflang", async () => {
    for (const language of ["en", "ko"] as const) {
      const { document } = await renderHead(language, SITE);
      const links = [...document.querySelectorAll("link[rel=alternate][hreflang]")];
      expect(links.map((link) => link.getAttribute("hreflang"))).toEqual(["en", "ko", "x-default"]);
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        `${SITE}/`,
        `${SITE}/ko/`,
        `${SITE}/`,
      ]);
    }
  });

  it("UI-SH6 주소 있음: 공유 그림", async () => {
    for (const language of ["en", "ko"] as const) {
      const page = pages[language];
      const imageUrl = SITE + page.image;
      const { document } = await renderHead(language, SITE);
      expect(one(document, 'meta[property="og:image"]')).toBe(imageUrl);
      expect(one(document, 'meta[name="twitter:image"]')).toBe(imageUrl);
      expect(one(document, 'meta[property="og:image:alt"]')).toBe(page.imageAlt);
      expect(one(document, 'meta[name="twitter:image:alt"]')).toBe(page.imageAlt);
      expect(one(document, 'meta[property="og:image:width"]')).toBe("1200");
      expect(one(document, 'meta[property="og:image:height"]')).toBe("630");
    }
  });

  it("UI-SH7 JSON-LD는 하나이고 buildStructuredData와 같다", async () => {
    for (const siteUrl of ["", SITE]) {
      for (const language of ["en", "ko"] as const) {
        const { document } = await renderHead(language, siteUrl);
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        expect(scripts).toHaveLength(1);
        const route = languageRoutes.find((candidate) => candidate.language === language);
        expect(jsonLd(document)[0]).toEqual(
          buildStructuredData({
            siteUrl,
            language,
            path: route?.path ?? "",
            name: siteName,
            description: pages[language].description,
            faq,
          }),
        );
      }
    }
    expect(defaultLanguage).toBe("en");
  });

  it("UI-SH8 JSON-LD의 FAQPage는 넘긴 faq와 같다", async () => {
    const { document } = await renderHead("en", SITE);
    const [data] = jsonLd(document) as {
      "@graph"?: { "@type": string; mainEntity?: unknown[] }[];
    }[];
    const page = data?.["@graph"]?.find((node) => node["@type"] === "FAQPage");
    expect(page).toBeDefined();
    expect(page?.mainEntity).toEqual(
      faq.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: { "@type": "Answer", text: entry.answer },
      })),
    );
  });
});
