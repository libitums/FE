// 이 작업이 더하거나 고치는 컴포넌트의 props 계약입니다. 타입만 둡니다.
// 각 `.astro` 파일의 `Props`가 여기 타입을 그대로 씁니다(`type Props = FaqProps`).

import type { Copy } from "../i18n/copy";
import type { FaqEntry, SiteUrl } from "../seo/seo.contract";
import type { Language } from "../site";

/**
 * `layouts/Base.astro` — 모든 페이지가 함께 쓰는 문서 껍데기입니다.
 * 페이지마다 다른 head 내용은 이름 붙은 슬롯 `head`로 받습니다(랜딩은 `SeoHead`를 꽂고 404는 비웁니다).
 */
export interface BaseProps {
  language: Language;
  title: string;
  description: string;
  /** `<meta name="robots">`의 값입니다. `robotsIndexable` 또는 `robotsNoindex` 상수를 넘깁니다. */
  robots: string;
}

/** `components/SeoHead.astro` — 색인되는 페이지의 공유 카드 · canonical · hreflang · JSON-LD입니다. */
export interface SeoHeadProps {
  language: Language;
  /** `Astro.site?.origin ?? ""`를 `Landing.astro`가 넘깁니다. */
  siteUrl: SiteUrl;
  /** `Faq`에 넘기는 것과 **같은 배열**입니다. */
  faq: readonly FaqEntry[];
}

/** `components/Faq.astro` — 보이는 질문 · 답 섹션입니다. */
export interface FaqProps {
  t: Copy;
  /** `SeoHead`에 넘기는 것과 **같은 배열**입니다. */
  entries: readonly FaqEntry[];
}

/** `components/NotFound.astro` — 404 본문입니다. `pages/404.astro`가 기본 언어로 그립니다. */
export interface NotFoundProps {
  language: Language;
}

/**
 * 머리 · 꼬리가 놓이는 페이지의 종류입니다.
 * - `"landing"`: 히어로와 섹션이 있는 랜딩. 머리는 히어로 위에서 투명하고 섹션 메뉴 · 언어 메뉴를 냅니다.
 * - `"page"`: 히어로가 없는 페이지(404). 머리는 처음부터 배경을 갖고 로고와 받기 버튼만 내며, 링크는 그 언어의 홈으로 갑니다.
 */
export type ChromeVariant = "landing" | "page";

/** `components/Header.astro` */
export interface HeaderProps {
  language: Language;
  t: Copy;
  /** 기본값 `"landing"`. */
  variant?: ChromeVariant;
}

/** `components/Footer.astro` */
export interface FooterProps {
  language: Language;
  t: Copy;
  /** 기본값 `"landing"`. */
  variant?: ChromeVariant;
}
