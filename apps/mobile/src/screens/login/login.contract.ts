// `login.ts`(순수 로직)와 `loginMethodLabel`의 이름·시그니처는 이 화면의 계약이
// 소유하는 자리입니다.

import type { EntryLoginMethod } from "../../lib/entry-flow";

export type LoginScreenProps = {
  /**
   * `phone`일 때만 `phoneNumber`에 국가 번호를 붙인 입력값(예: `+82 10 1234 5678`)을
   * 싣습니다 — 코드 검증 화면이 보여 줄 값입니다. 입력이 비었으면 싣지 않습니다.
   * 저장·전송하지 않습니다.
   */
  readonly onSelectMethod: (method: EntryLoginMethod, phoneNumber?: string) => void;
  /** 좌상단 뒤로가기(2026-09-21 디자인 반영)입니다. 없으면 뒤로가기를 그리지 않습니다. */
  readonly onBack?: () => void;
};

export type LoginTestId =
  | "login-screen-scroll"
  | "login-screen-title"
  | "login-screen-phone-field"
  | "login-screen-header"
  | "login-screen-country"
  | "login-screen-legal"
  | `login-screen-method-${EntryLoginMethod}`;
