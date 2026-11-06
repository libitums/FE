import type { APIRoute } from "astro";
import { buildFaq, storeAvailabilityOf } from "../seo/faq";
import { buildLlmsTxt } from "../seo/llms-txt";
import {
  brandProfiles,
  defaultLanguage,
  languages,
  pages,
  pathFor,
  siteAlternateNames,
  siteName,
  storeLinks,
} from "../site";

// 영어로만 쓰는 파일이라(ADR-0043 D8) 한글 표기 같은 ASCII 밖 이름은 뺍니다.
const asciiOnly = (value: string) => /^[\x20-\x7e]+$/.test(value);

export const GET: APIRoute = ({ site }) => {
  const body = buildLlmsTxt({
    siteUrl: site?.origin ?? "",
    name: siteName,
    summary: pages[defaultLanguage].description,
    alsoKnownAs: siteAlternateNames.filter(asciiOnly),
    links: [
      { label: "Google Play", url: storeLinks.android },
      { label: "App Store", url: storeLinks.ios },
      ...brandProfiles.map((profile) => ({ label: profile.name, url: profile.url })),
    ].filter((link) => link.url !== ""),
    // 본문은 기본 언어(영어)로만 씁니다. 다른 언어의 페이지도 영어 이름으로 가리킵니다.
    pages: languages.map((language) => ({
      title:
        language === defaultLanguage
          ? pages[language].title
          : `${siteName} in ${pages[language].englishName}`,
      label: pages[language].englishName,
      path: pathFor(language),
    })),
    faq: buildFaq({
      copy: pages[defaultLanguage].copy,
      storeAvailability: storeAvailabilityOf(storeLinks),
    }),
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
