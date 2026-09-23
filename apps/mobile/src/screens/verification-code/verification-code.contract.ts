export type VerificationCodeScreenProps = {
  /**
   * 로그인에서 입력한 번호(국가 번호 포함)입니다. 안내 문구 바로 아래 보입니다.
   * 없으면 그 줄을 그리지 않습니다.
   */
  readonly phoneNumber?: string;
  readonly onSubmit: () => void;
  /** 좌상단 뒤로가기입니다 — 로그인으로 돌아갑니다. */
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
  | "verification-code-screen-submit";
