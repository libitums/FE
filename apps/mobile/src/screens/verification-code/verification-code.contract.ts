// LIB-261 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-261/spec.md §2.5(순수 타입 계약) · §4.5(testid
// 카탈로그). 이 파일은 `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시
// 정의하지 않는다.

export type VerificationCodeScreenProps = {
  readonly onSubmit: () => void;
  readonly onExit: () => void;
};

export type VerificationCodeTestId =
  | "verification-code-screen-scroll"
  | "verification-code-screen-title"
  | "verification-code-screen-exit"
  | "verification-code-screen-description"
  | "verification-code-screen-input"
  | "verification-code-screen-submit";
