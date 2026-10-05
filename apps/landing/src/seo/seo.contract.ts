// 검색 · 답변 엔진용 산출물(head 메타 · JSON-LD · FAQ · llms.txt · robots.txt)의 타입 계약입니다.
// 타입만 둡니다. 이 파일은 아무것도 import하지 않습니다 — `src/seo/`의 모듈은 잎이고,
// `src/site.ts` · 컴포넌트 · `astro.config.ts`가 이쪽을 부릅니다(반대 방향 없음).

// ---------------------------------------------------------------- 배포 주소

/**
 * 정규화된 배포 주소입니다. `""`(없음)이거나 `https://호스트[:포트]` 꼴의 오리진입니다.
 * 끝 슬래시 · 경로 · 쿼리 · 해시가 없습니다.
 */
export type SiteUrl = string;

export interface SiteUrlSource {
  /** `process.env.SITE_URL` 원문입니다. 없거나 공백뿐이면 `fallback`을 봅니다. */
  env: string | undefined;
  /** `src/site.ts`의 `fallbackSiteUrl`입니다. 비어 있으면 주소 없음(`""`)입니다. */
  fallback: string;
}

/**
 * 환경 변수 → 상수 순으로 배포 주소를 정합니다. 고른 값이 `https://` 오리진이 아니면 던집니다.
 * 던지는 `Error`의 메시지는 출처 이름(`SITE_URL` 또는 `fallbackSiteUrl`) · 받은 값 · 기대하는 꼴을 담습니다.
 */
export type ResolveSiteUrl = (source: SiteUrlSource) => SiteUrl;

// ---------------------------------------------------------------- 언어별 자리

/** 언어 하나가 서는 자리입니다. `src/site.ts`의 `languages`에서 나옵니다(첫째가 기본 언어). */
export interface LanguageRoute {
  /** BCP 47 언어 코드입니다(`en` · `ko`). `hreflang`과 `inLanguage`에 그대로 씁니다. */
  language: string;
  /** 사이트 루트 기준 주소입니다. `/`로 시작하고 `/`로 끝납니다(`/` · `/ko/`). */
  path: string;
  /** Open Graph 로캘입니다(`en_US` · `ko_KR`). */
  locale: string;
}

// ---------------------------------------------------------------- head 메타

export interface HeadMetaInput {
  siteUrl: SiteUrl;
  /** 지금 그리는 페이지의 언어입니다. `routes`에 있어야 합니다. */
  language: string;
  /** 전체 언어 목록입니다. 첫째가 기본 언어이고 `x-default`가 그것을 가리킵니다. */
  routes: readonly LanguageRoute[];
  /** `public/`의 공유 카드 그림 주소입니다(`/og-en.jpg`). */
  imagePath: string;
}

export interface HreflangLink {
  /** 언어 코드 또는 `"x-default"`입니다. */
  hreflang: string;
  href: string;
}

/** 절대 주소가 있어야 만들 수 있는 것들입니다. 배포 주소가 없으면 통째로 없습니다. */
export interface AbsoluteHeadMeta {
  canonical: string;
  /** `routes` 순서대로 언어마다 하나, 마지막에 `x-default` 하나입니다. */
  alternates: readonly HreflangLink[];
  /** `og:image`와 `twitter:image`가 같이 쓰는 주소입니다. */
  imageUrl: string;
}

export interface HeadMeta {
  ogLocale: string;
  /** 이 페이지가 아닌 나머지 언어의 로캘입니다(`og:locale:alternate`). `routes` 순서를 따릅니다. */
  ogLocaleAlternates: readonly string[];
  absolute: AbsoluteHeadMeta | undefined;
}

/** `language`가 `routes`에 없거나 `routes`가 비었거나 주소가 `/`로 시작하지 않으면 던집니다. */
export type BuildHeadMeta = (input: HeadMetaInput) => HeadMeta;

// ---------------------------------------------------------------- FAQ

/** 질문의 정체입니다. 이 순서가 화면 · `FAQPage` · `llms.txt`의 순서입니다. */
export type FaqId = "what" | "who" | "different" | "activities" | "hangul" | "language" | "where";

/** 스토어 주소가 하나라도 있으면 `available`, 둘 다 비었으면 `coming-soon`입니다. */
export type StoreAvailability = "coming-soon" | "available";

export interface StoreLinks {
  ios: string;
  android: string;
}

export type StoreAvailabilityOf = (links: StoreLinks) => StoreAvailability;

/**
 * FAQ가 읽는 문구 키입니다. `src/i18n/copy.ts`의 `Copy`가 이 키를 전부 갖게 되므로
 * `Copy`를 그대로 넘길 수 있습니다. 값은 태그 없는 평문입니다(`<br />` 금지).
 */
export type FaqCopyKey =
  | "faqWhatQ"
  | "faqWhatA"
  | "faqWhoQ"
  | "faqWhoA"
  | "faqDifferentQ"
  | "faqDifferentA"
  | "faqActivitiesQ"
  | "faqActivitiesA"
  | "faqHangulQ"
  | "faqHangulA"
  | "faqLanguageQ"
  | "faqLanguageA"
  | "faqWhereQ"
  | "faqWhereASoon"
  | "faqWhereAAvailable";

export type FaqCopy = Record<FaqCopyKey, string>;

export interface FaqEntry {
  id: FaqId;
  question: string;
  answer: string;
}

export interface FaqInput {
  copy: FaqCopy;
  storeAvailability: StoreAvailability;
}

/** 언어 하나의 질문 · 답 목록입니다. 화면 · 구조화 데이터 · `llms.txt`가 이 결과 하나만 읽습니다. */
export type BuildFaq = (input: FaqInput) => readonly FaqEntry[];

// ---------------------------------------------------------------- 구조화 데이터 (JSON-LD)

/** 사이트 전체입니다. `url`은 언어와 무관하게 사이트 루트입니다. */
export interface WebSiteNode {
  "@type": "WebSite";
  name: string;
  description: string;
  inLanguage: string;
  url?: string;
}

/** 가격(`offers`) · 평점(`aggregateRating`) · 리뷰 · 만든 곳(`author` · `publisher`)은 근거가 없어 두지 않습니다. */
export interface SoftwareApplicationNode {
  "@type": "SoftwareApplication";
  name: string;
  description: string;
  applicationCategory: "EducationalApplication";
  operatingSystem: "iOS, Android";
  inLanguage: string;
  url?: string;
}

export interface FaqQuestionNode {
  "@type": "Question";
  name: string;
  acceptedAnswer: {
    "@type": "Answer";
    text: string;
  };
}

export interface FaqPageNode {
  "@type": "FAQPage";
  inLanguage: string;
  url?: string;
  mainEntity: readonly FaqQuestionNode[];
}

export interface StructuredData {
  "@context": "https://schema.org";
  "@graph": readonly [WebSiteNode, SoftwareApplicationNode, FaqPageNode];
}

export interface StructuredDataInput {
  siteUrl: SiteUrl;
  language: string;
  /** 이 언어 페이지의 루트 기준 주소입니다(`LanguageRoute.path`). */
  path: string;
  /** 서비스 이름입니다(`Duru`). */
  name: string;
  /** 그 언어의 검색 설명입니다(`pages[language].description`). */
  description: string;
  faq: readonly FaqEntry[];
}

/** `faq`가 비었으면 던집니다 — 빈 `FAQPage`를 내지 않습니다. */
export type BuildStructuredData = (input: StructuredDataInput) => StructuredData;

/** `<script type="application/ld+json">` 안에 넣을 문자열입니다. `<`를 `<`로 바꿔 태그가 닫히지 않게 합니다. */
export type SerializeStructuredData = (data: StructuredData) => string;

// ---------------------------------------------------------------- llms.txt

export interface LlmsTxtPage {
  /** 링크 글자입니다. 기본 언어는 검색 제목, 다른 언어는 영어로 쓴 「Duru in Korean」 꼴입니다. */
  title: string;
  /** 영어로 쓴 언어 이름입니다(`pages[language].englishName`). */
  label: string;
  path: string;
}

export interface LlmsTxtInput {
  siteUrl: SiteUrl;
  name: string;
  /** 한 문단 요약입니다. 줄바꿈이 없어야 합니다. */
  summary: string;
  /** 언어 목록 순서 그대로입니다. */
  pages: readonly LlmsTxtPage[];
  /** 기본 언어의 FAQ입니다. */
  faq: readonly FaqEntry[];
}

/** `summary`에 줄바꿈이 있거나 `pages` · `faq`가 비었으면 던집니다. */
export type BuildLlmsTxt = (input: LlmsTxtInput) => string;

// ---------------------------------------------------------------- robots.txt

/** 이름으로 허용하는 답변 엔진 수집기입니다. 이 순서로 적습니다. */
export type AnswerEngineCrawler =
  | "GPTBot"
  | "OAI-SearchBot"
  | "ChatGPT-User"
  | "ClaudeBot"
  | "PerplexityBot"
  | "Google-Extended";

export interface RobotsTxtInput {
  siteUrl: SiteUrl;
  crawlers: readonly AnswerEngineCrawler[];
}

export type BuildRobotsTxt = (input: RobotsTxtInput) => string;
