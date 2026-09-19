// LIB-261 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-261/spec.md §1(컴포넌트 트리) · §4.5(testid
// 카탈로그). 이 파일은 `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시
// 정의하지 않는다.

import type { EntryLanguage } from "../../lib/entry-language";

export type JourneyEntryScreenProps = {
  readonly language: EntryLanguage;
  readonly onEnter: () => void;
};

export type JourneyEntryTestId =
  | "journey-entry-screen-scroll"
  | "journey-entry-screen-title"
  | "journey-entry-screen-language"
  | "journey-entry-screen-start";
