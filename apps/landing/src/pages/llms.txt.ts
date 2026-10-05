import type { APIRoute } from "astro";
import { buildFaq, storeAvailabilityOf } from "../seo/faq";
import { buildLlmsTxt } from "../seo/llms-txt";
import { defaultLanguage, languages, pages, pathFor, siteName, storeLinks } from "../site";

export const GET: APIRoute = ({ site }) => {
  const body = buildLlmsTxt({
    siteUrl: site?.origin ?? "",
    name: siteName,
    summary: pages[defaultLanguage].description,
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
