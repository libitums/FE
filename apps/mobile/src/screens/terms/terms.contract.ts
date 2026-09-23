// 약관 화면의 props·testid 타입을 소유합니다. 구현·JSX는 두지 않습니다.
//
// 실제 법무 문구가 아닙니다(범위 밖). 외부 링크 · 웹뷰 0건 — `<view>`·`<text>`뿐입니다.

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
