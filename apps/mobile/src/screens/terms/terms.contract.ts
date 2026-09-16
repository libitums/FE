// LIB-259 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-259/spec.md §2.9(순수 타입 계약) · §4.9(testid 카탈로그).
//
// 실제 법무 문구가 아니다(scope_out). 외부 링크 · 웹뷰 0건 — `<view>`·`<text>`뿐이다.

export type TermsSectionId = string;

export type TermsSection = {
  readonly id: TermsSectionId;
  readonly title: string;
  readonly paragraphs: readonly string[];
};

export type TermsScreenProps = {
  readonly sections: readonly TermsSection[];
  readonly onExit: () => void;
};

export type TermsTestId =
  | "terms-screen-exit"
  | "terms-screen-title"
  | "terms-screen-scroll"
  | "terms-screen-content"
  | `terms-section-${TermsSectionId}`
  | `terms-section-title-${TermsSectionId}`
  | `terms-section-paragraph-${TermsSectionId}-${number}`;
