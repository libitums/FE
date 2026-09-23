// 고른 언어는 App `useState`가 소유합니다 — 이 화면은 값과 콜백만 받습니다.

import type { EntryLanguage } from "../../lib/entry-language";

export type LanguageSelectScreenProps = {
  readonly selected: EntryLanguage;
  readonly onSelect: (language: EntryLanguage) => void;
  readonly onContinue: () => void;
  /** 좌상단 뒤로가기(2026-09-21 디자인 반영)입니다. 없으면 뒤로가기를 그리지 않습니다. */
  readonly onBack?: () => void;
};

// 2026-09-21 디자인 반영: 선택지는 ui-lynx OptionSelector가 그립니다 — 항목
// testid는 `ui-lynx-option-selector-item-${EntryLanguage}`이고 이 화면은 감싸는
// 자리만 둡니다.
export type LanguageSelectTestId =
  | "language-select-screen-header"
  | "language-select-screen-scroll"
  | "language-select-screen-title"
  | "language-select-screen-caption"
  | "language-select-screen-options"
  | "language-select-screen-next";
