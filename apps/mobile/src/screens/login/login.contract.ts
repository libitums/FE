// `login.ts`(순수 로직)와 `loginMethodLabel`의 이름·시그니처는 이 화면의 계약이
// 소유하는 자리입니다.

import type { EntryLoginMethod } from "../../lib/entry-flow";
import type {
  PhoneNumber,
  PhoneOtpRequestFailure,
  PhoneOtpRequestResult,
} from "../../lib/auth-session.contract";

/** 코드 검증을 거치지 않는 셋입니다. 지금처럼 임시 토큰을 씁니다. */
export type SocialLoginMethod = Exclude<EntryLoginMethod, "phone">;

/** 전화번호 제출의 화면 로컬 상태입니다. */
export type LoginPhoneStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "requesting" }
  | { readonly kind: "failed"; readonly reason: PhoneOtpRequestFailure };

export type LoginScreenProps = {
  /** 소셜 버튼입니다. 요청 중에는 부르지 않습니다. */
  readonly onSelectSocialMethod: (method: SocialLoginMethod) => void;
  /**
   * `Continue`입니다. `phoneNumberFrom`이 `null`이 아니고 요청 중이 아닐 때만 부릅니다.
   * `sent`면 결선이 이미 코드 화면으로 옮겼습니다. `failed`면 화면이 문구를 그립니다.
   */
  readonly onSubmitPhoneNumber: (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
  /** (변경 없음) 요청 중에는 부르지 않습니다. */
  readonly onBack?: () => void;
};

export type LoginTestId =
  | "login-screen-scroll"
  | "login-screen-title"
  | "login-screen-phone-field"
  | "login-screen-header"
  | "login-screen-country"
  | "login-screen-legal"
  | "login-screen-error" // 신규
  | `login-screen-method-${EntryLoginMethod}`;
