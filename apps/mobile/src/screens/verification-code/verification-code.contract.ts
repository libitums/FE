import type {
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyOutcome,
  PhoneOtpVerifyRequest,
  VerificationCodeFailure,
} from "../../lib/auth-session.contract";

/** 검증 · 재전송의 화면 로컬 상태입니다. 둘이 동시에 뜨지 않습니다. */
export type VerificationCodeStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "verifying" }
  | { readonly kind: "resending" }
  | { readonly kind: "failed"; readonly reason: VerificationCodeFailure };

export type VerificationCodeScreenProps = {
  /** 필수로 바뀝니다 — 전화번호 경로에서만 이 화면에 오고, 그때 번호가 늘 있습니다. */
  readonly phoneNumber: PhoneNumber;
  /** `Continue`입니다. 코드가 완성이고 요청 중이 아닐 때만 부릅니다. */
  readonly onVerifyCode: (request: PhoneOtpVerifyRequest) => Promise<PhoneOtpVerifyOutcome>;
  /** `Resend`입니다. 요청 중이 아닐 때만 부릅니다. */
  readonly onResendCode: (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
  /** (변경 없음) 요청 중에는 부르지 않습니다. */
  readonly onExit: () => void;
};

export type VerificationCodeTestId =
  | "verification-code-screen-scroll"
  | "verification-code-screen-title"
  | "verification-code-screen-exit"
  | "verification-code-screen-description"
  | "verification-code-screen-phone"
  | "verification-code-screen-timer"
  | "verification-code-screen-resend"
  | "verification-code-screen-input"
  | "verification-code-screen-submit"
  | "verification-code-screen-error"; // 신규
