// 프로필 화면의 props·testid 타입을 소유합니다. 구현·JSX는 두지 않습니다.
//
// **파생값을 한 칸도 넣지 않습니다** — `ProfileItem`의 필드는 셋뿐입니다.
// 연속 학습일 · 완료 스텝 수 · 진행률 · 클리어 수는 이 타입에 자리가 없습니다.

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
