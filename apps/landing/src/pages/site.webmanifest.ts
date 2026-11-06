import type { APIRoute } from "astro";
import { manifestIcons } from "../seo/icon-links";
import { buildWebManifest } from "../seo/web-manifest";
import { defaultLanguage, pages, siteName } from "../site";

// 검색엔진이 사이트 이름을 읽는 자리 중 하나입니다(`WebSite` JSON-LD · `og:site_name` · `<title>`과 같은 이름).
export const GET: APIRoute = ({ site }) => {
  const body = buildWebManifest({
    siteUrl: site?.origin ?? "",
    name: siteName,
    description: pages[defaultLanguage].description,
    language: defaultLanguage,
    themeColor: "#F46B18",
    backgroundColor: "#FFFDFC",
    icons: manifestIcons,
  });
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
};
