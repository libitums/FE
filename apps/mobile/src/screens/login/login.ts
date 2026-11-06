// 로그인 순수 로직을 소유합니다.

import type { AppPolicy } from "../../lib/app-policy";
import type { AppPlatform } from "../../lib/app-version";
import type { PhoneNumber, PhoneOtpRequestResult } from "../../lib/auth-session.contract";
import { entryLoginMethods, type EntryLoginMethod } from "../../lib/entry-flow";
import type { SocialSignInOutcome } from "../../lib/social-sign-in.contract";
import type {
  LoginCopy,
  LoginMethodStatus,
  LoginStatus,
  PhoneSignInVisibility,
  SocialLoginMethod,
} from "./login.contract";

// 라벨은 임시가 아닌 최종값입니다 — `ui` 테스트도 리터럴을 단언하지 않지만 값
// 자체는 자리표가 아닙니다. 값은 문구표의 `login.method`가 집니다 — 수단이 늘면 그 표가
// TS 오류로 섭니다.
export function loginMethodLabel(method: EntryLoginMethod, copy: LoginCopy): string {
  return copy.method[method];
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

/** `requesting`일 때만 참입니다 — 수단과 무관합니다. */
export function isLoginBusy(status: LoginStatus): boolean {
  return status.kind === "requesting";
}

/** 번호가 있고 요청 중이 아닐 때만 참입니다. */
export function canRequestPhoneOtp(
  phone: PhoneNumber | null,
  status: LoginStatus,
): phone is PhoneNumber {
  return phone !== null && !isLoginBusy(status);
}

// ------------------------------------------------------------------ 소셜

/** 요청 중이 아닐 때만 참입니다. */
export function canStartSocialSignIn(status: LoginStatus): boolean {
  return !isLoginBusy(status);
}

/** 수단 요소 하나의 `data-status`입니다. 상태가 그 수단의 것이 아니면 `idle`입니다. */
export function loginMethodStatus(
  status: LoginStatus,
  method: EntryLoginMethod,
): LoginMethodStatus {
  if (status.kind === "idle") {
    return "idle";
  }
  return status.method === method ? status.kind : "idle";
}

/** 전화번호 요청 결과 → 다음 상태입니다. */
export function loginStatusAfterPhoneResult(result: PhoneOtpRequestResult): LoginStatus {
  if (result.status === "sent") {
    return { kind: "idle" };
  }
  return { kind: "failed", method: "phone", reason: result.reason };
}

/** 소셜 로그인 결과 → 다음 상태입니다. 취소는 `idle`과 구별되지 않습니다. */
export function loginStatusAfterSocialOutcome(
  method: SocialLoginMethod,
  outcome: SocialSignInOutcome,
): LoginStatus {
  if (outcome.status === "failed") {
    return { kind: "failed", method, reason: outcome.reason };
  }
  return { kind: "idle" };
}

/** 번호 · 국가를 고쳤을 때의 다음 상태입니다. `failed`면 수단과 무관하게 `idle`입니다. */
export function loginStatusAfterEdit(status: LoginStatus): LoginStatus {
  if (status.kind === "failed") {
    return { kind: "idle" };
  }
  return status;
}

/**
 * 제품의 전화번호 수단입니다. **2026-09-29부터 잠시 숨깁니다** — SMS 공급자가 없어 실제 번호로는
 * 코드가 오지 않고, 소셜 제공자 설정을 하는 동안 로그인 화면에 소셜 셋만 둡니다. 되살릴 때는 이
 * 값을 `visible`로 바꿉니다. 화면 · 결선 · 테스트는 `visible`을 그대로 지킵니다.
 */
export const productPhoneSignIn: PhoneSignInVisibility = "hidden";

/** 로그인 화면의 제목과 안내입니다. 전화번호 수단을 숨기면 전화번호를 말하지 않습니다. */
export function loginHeading(
  phoneSignIn: PhoneSignInVisibility,
  copy: LoginCopy,
): { readonly title: string; readonly caption: string } {
  return copy.heading[phoneSignIn];
}

// ------------------------------------------------------------------ 사용 불가 수단 (ADR-0111 개정 2)

/** 제품이 **사용 불가로 안내하는** 수단입니다(Meta 앱 게시 전). 되돌릴 때 비웁니다. */
export const productUnavailableLoginMethods: readonly EntryLoginMethod[] = ["facebook"];
/** Android에서만 사용 불가인 수단(Apple Services ID 전). 되돌릴 때 비웁니다. */
export const androidUnavailableLoginMethods: readonly EntryLoginMethod[] = ["apple"];

export type LoginMethodAvailabilityInput = {
  /** 호스트가 보낸 플랫폼. 모르면(`null`) 플랫폼 제외는 없습니다. */
  readonly platform: AppPlatform | null;
  /** 플랫폼과 무관하게 사용 불가인 수단 — 제품값은 `productUnavailableLoginMethods`. */
  readonly unavailable: readonly EntryLoginMethod[];
};

/** 사용 불가 수단 전체입니다(어휘 순서 · 중복 없음). */
export function unavailableLoginMethods(
  input: LoginMethodAvailabilityInput,
): readonly EntryLoginMethod[] {
  const platformUnavailable = input.platform === "android" ? androidUnavailableLoginMethods : [];
  return entryLoginMethods.filter(
    (method) => input.unavailable.includes(method) || platformUnavailable.includes(method),
  );
}

/** `method`가 사용 불가 목록에 들었는지입니다. */
export function isLoginMethodUnavailable(
  method: EntryLoginMethod,
  input: LoginMethodAvailabilityInput,
): boolean {
  return unavailableLoginMethods(input).includes(method);
}

/** 안내 대화상자 제목에 들어가는 제공자 이름 — 상표라 번역하지 않는다(버튼 라벨 `loginMethodLabel`과 다르다). */
export const socialProviderName: Readonly<Record<SocialLoginMethod, string>> = {
  apple: "Apple",
  google: "Google",
  facebook: "Facebook",
};

/**
 * 사용 불가 안내 대화상자의 액션 — 「Connect with Google」(brand, 첫째) → 「Close」(subtle) 순서다.
 * 첫 동작의 라벨은 화면의 Google 버튼과 같은 문구다(WCAG 3.2.4 — 같은 동작 같은 이름).
 */
export function unavailableDialogActions(
  copy: LoginCopy,
): readonly { readonly id: string; readonly label: string }[] {
  return [
    { id: "use-google", label: loginMethodLabel("google", copy) },
    { id: "close", label: copy.unavailable.close },
  ];
}

/** 소셜 수단 전체(phone 제외)입니다. */
export const socialLoginMethods: readonly SocialLoginMethod[] = ["apple", "google", "facebook"];

/** 사용 불가인 소셜 수단 — 테스트 · 되돌리기 확인용(화면은 `isLoginMethodUnavailable`로 수단마다 판정한다). */
export function unavailableSocialLoginMethods(
  platform: AppPlatform | null,
  unavailable: readonly EntryLoginMethod[] = productUnavailableLoginMethods,
): readonly SocialLoginMethod[] {
  const result: SocialLoginMethod[] = [];
  for (const method of unavailableLoginMethods({ platform, unavailable })) {
    if (method !== "phone") {
      result.push(method);
    }
  }
  return result;
}

/** 정책(없으면 상수 기본값)을 반영한 사용 불가 수단입니다(어휘 순서 · 중복 없음). */
export function unavailableLoginMethodsFor(
  platform: AppPlatform | null,
  policy: AppPolicy | null,
): readonly EntryLoginMethod[] {
  const fromPolicy = policy?.unavailableLoginMethods;
  if (fromPolicy === undefined) {
    return unavailableLoginMethods({ platform, unavailable: productUnavailableLoginMethods });
  }
  const platformList = platform === "android" ? fromPolicy.android : [];
  return entryLoginMethods.filter(
    (method) => fromPolicy.all.includes(method) || platformList.includes(method),
  );
}

/** 위에서 phone을 뺀 소셜 수단입니다. */
export function unavailableSocialLoginMethodsFor(
  platform: AppPlatform | null,
  policy: AppPolicy | null,
): readonly SocialLoginMethod[] {
  const result: SocialLoginMethod[] = [];
  for (const method of unavailableLoginMethodsFor(platform, policy)) {
    if (method !== "phone") result.push(method);
  }
  return result;
}
