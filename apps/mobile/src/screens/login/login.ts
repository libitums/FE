// 로그인 순수 로직 — `loginMethodLabel`이라는 이름과 시그니처는 `logic-scaffold`가
// 처음 추론해 채웠고, 계약 보정 r0.1(§0.8(2) · §2.5-1)이 그것을 그대로 확정했다.
// 이 단계(`logic`)는 그 이름·시그니처를 받아 계약 §8이 고정한 로그인 수단 넷의
// 라벨 값을 채운다.

import type { EntryLoginMethod } from "../../lib/entry-flow";

// 라벨은 계약 §8이 "임시가 아닌 것"(최종값)으로 고정했다 — `ui` 테스트도 리터럴을
// 단언하지 않지만(LG1·LG-U1) 값 자체는 자리표가 아니다. `default` 없는 switch —
// 수단이 늘면 TS2366으로 선다.
export function loginMethodLabel(method: EntryLoginMethod): string {
  switch (method) {
    case "phone": {
      return "Continue";
    }
    case "google": {
      return "Connect with Google";
    }
    case "apple": {
      return "Sign in with Apple";
    }
    case "facebook": {
      return "Connect with Facebook";
    }
  }
}

// 전화번호 앞에 붙는 국가 코드 선택지 한 칸. 목록 전체는 `login-countries.ts`(생성 파일)에 있다.
// 선택값은 화면 로컬이며 어디에도 저장·전송하지 않는다(§0.5 A6).
export type LoginCountry = {
  /** ISO 3166 두 글자 코드(소문자). */
  readonly id: string;
  readonly flag: string;
  readonly name: string;
  readonly dialCode: string;
};

// 처음 선택된 국가.
export const defaultLoginCountryId = "kr";
