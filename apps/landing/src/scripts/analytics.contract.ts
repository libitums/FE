// 화면의 행동을 GA4 이벤트로 옮기는 순수 함수의 입출력 타입입니다. 타입만 있고 동작이 없습니다.
// 구현은 `analytics-events.ts`가 지고, `analytics.ts`는 DOM에서 아래 입력을 읽어 함수를 부른 뒤 결과를 gtag에 넘깁니다.
// 입력은 DOM 요소가 아니라 그 요소에서 읽은 값뿐이라, unit 테스트가 jsdom 없이 잴 수 있습니다.

/** 랜딩이 보내는 이벤트 다섯의 이름입니다. README 「분석 (GA4)」의 목록과 같습니다. */
export type AnalyticsEventName =
  | "section_view"
  | "cta_click"
  | "download_click"
  | "language_switch"
  | "faq_open";

/** gtag에 그대로 넘기는 `{ name, params }`입니다. 이름마다 속성 키가 닫혀 있습니다. */
export type AnalyticsEvent =
  | { name: "section_view"; params: { section: string } }
  | { name: "cta_click"; params: { location: "header" } }
  | { name: "download_click"; params: { store: string } }
  | { name: "language_switch"; params: { to: string } }
  | { name: "faq_open"; params: { question: string } };

/**
 * 눌린 `<a>`에서 읽은 값입니다. 누른 자리에서 가장 가까운 `<a>`가 없으면 함수에 `null`을 넘깁니다.
 * - `store`: `data-store` 속성(`link.dataset.store`). 없으면 `undefined`, 비어 있으면 `""`(없는 것으로 봅니다).
 * - `hash`: `link.hash` — `"#download"`처럼 `#`을 포함하고, 없으면 `""`.
 * - `inLanguageMenu`: 언어 메뉴(`.lang-menu`) 안의 링크인가 — `link.closest(".lang-menu") !== null`.
 * - `hreflang`: `link.hreflang`. 없으면 `""`.
 */
export interface ClickedLink {
  store: string | undefined;
  hash: string;
  inLanguageMenu: boolean;
  hreflang: string;
}

/** FAQ `<details>`의 `toggle`에서 읽은 값입니다. `faqId`는 `data-faq-id`(없으면 `undefined`). */
export interface FaqToggle {
  faqId: string | undefined;
  open: boolean;
}

/** IntersectionObserver 항목에서 읽은 값입니다. `id`는 섹션의 `id` 속성입니다. */
export interface SectionVisibility {
  id: string;
  isIntersecting: boolean;
}

/**
 * 눌린 링크 → 이벤트 또는 `null`. 우선순위는 지금 동작 그대로입니다:
 * 1. `store`가 비어 있지 않으면 `download_click { store }`
 * 2. 아니면 `hash === "#download"`이면 `cta_click { location: "header" }`
 * 3. 아니면 `inLanguageMenu`이면 `language_switch { to: hreflang }` (`hreflang`이 `""`여도 보냅니다)
 * 4. 그 밖(링크가 없거나 어느 조건도 아님)은 `null`
 */
export type ClickEventOf = (link: ClickedLink | null) => AnalyticsEvent | null;

/** 열릴 때만 `faq_open { question: faqId ?? "" }`, 닫힐 때는 `null`. */
export type FaqEventOf = (toggle: FaqToggle) => AnalyticsEvent | null;

/** 보이기 시작했고 `id`가 비어 있지 않으면 `section_view { section: id }`, 아니면 `null`. 「한 번만」은 접착(unobserve)이 집니다. */
export type SectionEventOf = (section: SectionVisibility) => AnalyticsEvent | null;

/** 섹션과 화면의 높이(px)입니다. 관찰을 시작할 때 읽습니다. */
export interface SectionSize {
  sectionHeight: number;
  viewportHeight: number;
}

/**
 * 「보였다」로 칠 IntersectionObserver 임계값입니다. 화면보다 짧은 섹션은 그 30%가 보일 때, 화면보다 긴 섹션은
 * 화면의 30%를 채웠을 때입니다: min(0.3, 0.3 × viewportHeight ÷ sectionHeight). 섹션 기준 30%만 쓰면 화면의
 * 3.3배를 넘는 섹션(Features — 넓은 화면의 연출 340vh · 좁은 화면의 세로 쌓임)은 영원히 못 미칩니다.
 * 높이가 0 이하이거나 수가 아니면 0.3.
 */
export type SectionThresholdOf = (size: SectionSize) => number;
