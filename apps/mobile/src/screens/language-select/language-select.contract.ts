// 고른 언어는 App `useState`가 소유합니다 — 이 화면은 값과 콜백만 받습니다.

import type { EntryLanguage } from "../../lib/entry-language";

export type LanguageSelectScreenProps = {
  readonly selected: EntryLanguage;
  readonly onSelect: (language: EntryLanguage) => void;
  readonly onContinue: () => void;
  /** 좌상단 뒤로가기(2026-09-21 디자인 반영)입니다. 없으면 뒤로가기를 그리지 않습니다. */
  readonly onBack?: () => void;
  /** 가입 흐름의 단계 진행 막대(3/3)를 그릴지입니다. 설정 › Language에서 열 때는 `false`(ADR-0093 D6). 기본 `true`. */
  readonly showSteps?: boolean;
};

/** 언어 선택 화면의 UI 문구 구획입니다(`UiCopy.languageSelect`). 언어 이름은 `entryLanguageLabel`이 집니다. */
export type LanguageSelectCopy = {
  readonly title: string;
  readonly caption: string;
  /**
   * 목록 위 미리보기 카드(2026-11-03 사용자 결정, 시안 A) — 고른 언어로 레슨이 어떻게 보이는지 작게 보입니다.
   * 한국어 예문 · 로마자는 학습 내용이라 화면이 들고(`languagePreviewSample`) 안내 · 뜻만 그 언어입니다. 버튼은 `common.check`.
   */
  readonly preview: {
    readonly question: string;
    readonly meaning: string;
  };
};

// 2026-09-21 디자인 반영: 선택지는 ui-lynx OptionSelector가 그립니다 — 항목
// testid는 `ui-lynx-option-selector-item-${EntryLanguage}`이고 이 화면은 감싸는
// 자리만 둡니다.
export type LanguageSelectTestId =
  | "language-select-screen-header"
  | "language-select-screen-scroll"
  | "language-select-screen-title"
  | "language-select-screen-caption"
  | "language-select-screen-preview"
  | "language-select-screen-options"
  | "language-select-screen-next";
