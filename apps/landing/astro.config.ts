import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import { resolveMeasurementId } from "./src/analytics/gtag";
import { resolveSiteUrl } from "./src/seo/site-url";
import { defaultLanguage, fallbackSiteUrl, languages } from "./src/site";

const locales = [...languages];

// 배포 주소는 여기서 한 번 정합니다. 컴포넌트와 엔드포인트는 Astro.site만 읽습니다.
const site = resolveSiteUrl({ env: process.env.SITE_URL, fallback: fallbackSiteUrl });

// 측정 ID의 모양이 틀리면 페이지를 그리기 전에 여기서 빌드를 멈춥니다. 값은 컴포넌트가 import.meta.env로 읽습니다.
resolveMeasurementId(process.env.PUBLIC_GA_MEASUREMENT_ID);

export default defineConfig({
  site: site || undefined,
  trailingSlash: "always",
  // CSS를 HTML에 넣어 첫 화면이 스타일시트 요청을 기다리지 않게 합니다(페이지가 둘이라 캐시 이득이 작습니다).
  build: { inlineStylesheets: "always" },
  i18n: {
    defaultLocale: defaultLanguage,
    locales,
  },
  // sitemap은 절대 주소가 있어야 만들 수 있습니다.
  integrations: site
    ? [
        sitemap({
          i18n: {
            defaultLocale: defaultLanguage,
            locales: Object.fromEntries(locales.map((locale) => [locale, locale])),
          },
        }),
      ]
    : [],
});
