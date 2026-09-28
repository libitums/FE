// 로그인 순수 로직을 소유합니다.

import type { PhoneNumber } from "../../lib/auth-session.contract";
import type { EntryLoginMethod } from "../../lib/entry-flow";
import type { LoginPhoneStatus } from "./login.contract";

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
// `login-countries.ts`(생성 파일)에 있습니다. 선택값은 화면 로컬이며 저장하지
// 않습니다 — 번호와 합쳐 인증 코드 요청에만 쓰입니다.
export type LoginCountry = {
  /** ISO 3166 두 글자 코드(소문자)입니다. */
  readonly id: string;
  readonly flag: string;
  readonly name: string;
  readonly dialCode: string;
};

// 처음 선택된 국가입니다.
export const defaultLoginCountryId = "kr";

/** 앞 `0`이 트렁크 접두가 아니라 번호의 일부인 국가 코드입니다. */
export const trunkZeroKeptDialCodes: readonly string[] = ["+39", "+378", "+225", "+242"];

/** `+`를 뺀 E.164 숫자의 상한입니다(ITU-T E.164). */
const e164MaxDigitLength = 15;

/**
 * 입력에서 숫자만 남기고 맨 앞 `0` 하나를 뗍니다(국내 트렁크 접두) — 단 앞 `0`이 번호의
 * 일부인 국가 코드(`trunkZeroKeptDialCodes`)는 떼지 않습니다. 남은 숫자가 없거나
 * E.164 상한을 넘으면 `null`입니다. `display`는 입력을 다듬지 않고 그대로 붙입니다.
 *
 * 국가 번호까지 붙은 번호(`+82 10 …`)를 붙여 넣으면 고른 국가 번호를 한 번만 씁니다 — 다른
 * 국가 번호로 시작하면 고른 국가와 어긋나므로 `null`입니다.
 */
export function phoneNumberFrom(dialCode: string, input: string): PhoneNumber | null {
  const trimmedInput = input.trim();
  let digitsOnly = trimmedInput.replace(/\D/g, "");
  if (digitsOnly.length === 0) {
    return null;
  }
  const international = trimmedInput.startsWith("+");
  if (international) {
    const dialDigits = dialCode.replace(/\D/g, "");
    if (!digitsOnly.startsWith(dialDigits)) {
      return null;
    }
    digitsOnly = digitsOnly.slice(dialDigits.length);
  }

  const keepsLeadingZero = trunkZeroKeptDialCodes.includes(dialCode);
  const nationalNumber =
    !keepsLeadingZero && digitsOnly.startsWith("0") ? digitsOnly.slice(1) : digitsOnly;
  if (nationalNumber.length === 0) {
    return null;
  }

  const e164 = `${dialCode}${nationalNumber}`;
  if (e164.replace(/\+/g, "").length > e164MaxDigitLength) {
    return null;
  }

  return { e164, display: international ? trimmedInput : `${dialCode} ${trimmedInput}` };
}

/** `requesting`일 때만 참입니다. */
export function isLoginBusy(status: LoginPhoneStatus): boolean {
  return status.kind === "requesting";
}

/** 번호가 있고 요청 중이 아닐 때만 참입니다. */
export function canRequestPhoneOtp(
  phone: PhoneNumber | null,
  status: LoginPhoneStatus,
): phone is PhoneNumber {
  return phone !== null && !isLoginBusy(status);
}
