// LIB-261 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-261/spec.md §1(컴포넌트 트리) · §4.5(testid
// 카탈로그). 이 파일은 `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시
// 정의하지 않는다.
//
// 고른 언어는 App `useState`가 소유한다(계약 §6) — 이 화면은 값과 콜백만 받는다.

import type { EntryLanguage } from "../../lib/entry-language";

export type LanguageSelectScreenProps = {
  readonly selected: EntryLanguage;
  readonly onSelect: (language: EntryLanguage) => void;
  readonly onContinue: () => void;
  /** 좌상단 뒤로가기(2026-09-21 디자인 반영). 없으면 뒤로가기를 그리지 않는다. */
  readonly onBack?: () => void;
};

// 2026-09-21 디자인 반영: 선택지는 ui-lynx OptionSelector가 그린다 — 항목 testid는
// `ui-lynx-option-selector-item-${EntryLanguage}`이고 이 화면은 감싸는 자리만 둔다.
export type LanguageSelectTestId =
  | "language-select-screen-header"
  | "language-select-screen-scroll"
  | "language-select-screen-title"
  | "language-select-screen-caption"
  | "language-select-screen-options"
  | "language-select-screen-next";
