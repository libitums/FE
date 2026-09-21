// LIB-259 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-259/spec.md §2.8(순수 타입 계약) · §4.9(testid 카탈로그).
//
// **파생값을 한 칸도 넣지 않는다**(§0.3 D-c) — `ProfileItem`의 필드는 셋뿐이다.
// 연속 학습일 · 완료 스텝 수 · 진행률 · 클리어 수는 이 타입에 자리가 없다.

export type ProfileItemId = string;

export type ProfileItem = {
  readonly id: ProfileItemId;
  readonly label: string;
  readonly value: string;
};

export type ProfileScreenProps = {
  readonly items: readonly ProfileItem[];
  readonly onExit: () => void;
};

export type ProfileTestId =
  | "profile-screen-exit"
  | "profile-screen-title"
  | "profile-screen-scroll"
  | "profile-screen-list"
  | `profile-item-${ProfileItemId}`
  | `profile-item-label-${ProfileItemId}`
  | `profile-item-value-${ProfileItemId}`;
