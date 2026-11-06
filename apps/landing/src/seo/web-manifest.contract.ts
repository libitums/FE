// `/site.webmanifest`의 타입 계약입니다. `seo.contract.ts`가 300줄을 넘어 따로 둡니다 — 같은 규칙(타입만, 잎)입니다.
import type { SiteUrl } from "./seo.contract";

export interface WebManifestIcon {
  /** 배포 주소가 없으면 `/파일`, 있으면 절대 주소입니다(아이콘 링크와 같은 규칙). */
  src: string;
  sizes: string;
  type: "image/png";
}

/** `/site.webmanifest`의 본문입니다. 검색엔진이 사이트 이름을 읽는 자리 중 하나라 `name` · `short_name`이 서비스 이름입니다. */
export interface WebManifest {
  name: string;
  short_name: string;
  description: string;
  lang: string;
  start_url: string;
  display: "browser";
  theme_color: string;
  background_color: string;
  icons: readonly WebManifestIcon[];
}

export interface WebManifestInput {
  siteUrl: SiteUrl;
  name: string;
  /** 기본 언어의 검색 설명입니다. */
  description: string;
  /** 기본 언어 코드입니다. */
  language: string;
  themeColor: string;
  backgroundColor: string;
  /** `public/` 기준 PNG 아이콘입니다. `/`로 시작해야 하고 비면 던집니다. */
  icons: readonly { path: string; sizes: string }[];
}

/** `icons`가 비었거나 어떤 `path`가 `/`로 시작하지 않으면 던집니다. */
export type BuildWebManifest = (input: WebManifestInput) => WebManifest;
