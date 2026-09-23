// 로그인 순수 로직을 소유합니다.

import type { EntryLoginMethod } from "../../lib/entry-flow";

// 라벨은 임시가 아닌 최종값입니다 — `ui` 테스트도 리터럴을 단언하지 않지만 값
// 자체는 자리표가 아닙니다. `default`를 두지 않습니다 — 수단이 늘면 TS2366으로
// 섭니다.
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

// 전화번호 앞에 붙는 국가 코드 선택지 한 칸입니다. 목록 전체는
// `login-countries.ts`(생성 파일)에 있습니다. 선택값은 화면 로컬이며 어디에도
// 저장·전송하지 않습니다.
export type LoginCountry = {
  /** ISO 3166 두 글자 코드(소문자)입니다. */
  readonly id: string;
  readonly flag: string;
  readonly name: string;
  readonly dialCode: string;
};

// 처음 선택된 국가입니다.
export const defaultLoginCountryId = "kr";
