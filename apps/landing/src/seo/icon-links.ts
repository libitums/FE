import type { BuildIconLinks, IconLink } from "./seo.contract";

interface IconFile extends Omit<IconLink, "href"> {
  /** `public/` 기준 주소입니다. */
  path: string;
}

/**
 * `public/`의 아이콘 파일입니다. 원본은 `assets/store/app-icon-512.png`이고 다시 만드는 절차는 README 「그림」에 있습니다.
 * - `favicon.ico` — 16 · 32 · 48px. 주소창 · 북마크용입니다.
 * - `favicon-96x96.png` — 검색 결과용입니다(Google은 48px 배수의 정사각형을 받습니다).
 * - `apple-touch-icon.png` — 180px. iOS 홈 화면 · Safari 탭용입니다.
 */
export const iconFiles: readonly IconFile[] = [
  { rel: "icon", path: "/favicon.ico", sizes: "any" },
  { rel: "icon", path: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
  { rel: "apple-touch-icon", path: "/apple-touch-icon.png", sizes: "180x180" },
];

export const buildIconLinks: BuildIconLinks = (siteUrl) =>
  iconFiles.map(({ path, ...link }) => ({ ...link, href: siteUrl + path }));
