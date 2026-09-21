// LIB-261 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-261/spec.md §2.5(순수 타입 계약) · §4.5(testid
// 카탈로그). 이 파일은 `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시
// 정의하지 않는다.

export type VerificationCodeScreenProps = {
  /** 로그인에서 입력한 번호(국가 번호 포함). 안내 문구 바로 아래 보인다. 없으면 그 줄을 그리지 않는다. */
  readonly phoneNumber?: string;
  readonly onSubmit: () => void;
  /** 좌상단 뒤로가기 — 로그인으로 돌아간다. */
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
