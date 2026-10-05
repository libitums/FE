import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import { resolveSiteUrl } from "./src/seo/site-url";
import { defaultLanguage, fallbackSiteUrl, languages } from "./src/site";

const locales = [...languages];

// 배포 주소는 여기서 한 번 정합니다. 컴포넌트와 엔드포인트는 Astro.site만 읽습니다.
const site = resolveSiteUrl({ env: process.env.SITE_URL, fallback: fallbackSiteUrl });

export default defineConfig({
  site: site || undefined,
  trailingSlash: "always",
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
