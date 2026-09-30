// `login.ts`(순수 로직)와 `loginMethodLabel`의 이름·시그니처는 이 화면의 계약이
// 소유하는 자리입니다.

import type { EntryLoginMethod } from "../../lib/entry-flow";
import type {
  PhoneNumber,
  PhoneOtpRequestFailure,
  PhoneOtpRequestResult,
} from "../../lib/auth-session.contract";
import type { LegalDocument } from "../../lib/legal-document.contract";
import type { SocialSignInFailure, SocialSignInOutcome } from "../../lib/social-sign-in.contract";

/** 코드 검증을 거치지 않는 셋입니다. Supabase OAuth로 들어옵니다. */
export type SocialLoginMethod = Exclude<EntryLoginMethod, "phone">;

/**
 * 로그인 화면의 요청 상태 하나입니다. 네 수단이 공유합니다 — 둘이 동시에 뜨지 않습니다.
 * `requesting` · `failed`는 어느 수단의 것인지 싣습니다.
 */
export type LoginStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "requesting"; readonly method: EntryLoginMethod }
  | { readonly kind: "failed"; readonly method: "phone"; readonly reason: PhoneOtpRequestFailure }
  | {
      readonly kind: "failed";
      readonly method: SocialLoginMethod;
      readonly reason: SocialSignInFailure;
    };

/** 수단 요소 하나의 `data-status` 값입니다. */
export type LoginMethodStatus = LoginStatus["kind"];

/**
 * 전화번호 수단을 그릴지입니다. `hidden`이면 번호 칸 · 국가 선택 · `Continue` · `or` 구분선이
 * 서지 않고 소셜 셋만 섭니다. 전화번호 로그인의 결선과 로직은 그대로 남습니다.
 */
export type PhoneSignInVisibility = "visible" | "hidden";

export type LoginScreenProps = {
  readonly phoneSignIn: PhoneSignInVisibility;
  /**
   * 소셜 버튼입니다. 요청 중이 아닐 때만 부릅니다. `signed-in`이면 결선이 이미 다음 화면으로
   * 옮겼습니다. `cancelled`면 조용히 `idle`, `failed`면 화면이 문구를 그립니다.
   */
  readonly onSelectSocialMethod: (method: SocialLoginMethod) => Promise<SocialSignInOutcome>;
  /**
   * `Continue`입니다. `phoneNumberFrom`이 `null`이 아니고 요청 중이 아닐 때만 부릅니다.
   * `sent`면 결선이 이미 코드 화면으로 옮겼습니다. `failed`면 화면이 문구를 그립니다.
   */
  readonly onSubmitPhoneNumber: (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
  /** (변경 없음) 요청 중에는 부르지 않습니다. */
  readonly onBack?: () => void;
  /**
   * 안내 문구의 「Terms of Use」 · 「Privacy Policy」입니다. 문서는 앱 위 브라우저로 열리고
   * 로그인 화면은 그대로 남습니다(ADR-0032). 요청 중에도 막지 않습니다 — 로그인 상태와 무관합니다.
   */
  readonly onOpenLegalDocument: (document: LegalDocument) => void;
};

/** 소셜 버튼 셋입니다. 상태를 읽어 요소마다 `data-status`를 내고, 요청 중이면 탭을 무시합니다. */
export type LoginSocialMethodsProps = {
  readonly status: LoginStatus;
  readonly onSelect: (method: SocialLoginMethod) => void;
};

export type LoginTestId =
  | "login-screen-scroll"
  | "login-screen-title"
  | "login-screen-phone-field"
  | "login-screen-header"
  | "login-screen-country"
  | "login-screen-legal"
  | `login-screen-legal-${LegalDocument}`
  | "login-screen-error" // 신규
  | `login-screen-method-${EntryLoginMethod}`;
