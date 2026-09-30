// 프로필 화면의 props·testid 타입을 소유합니다. 구현·JSX는 두지 않습니다.
//
// 계정 정보와 학습 언어를 읽기 전용으로 표시합니다.
// 연속 학습일 · 완료 스텝 수 · 진행률 · 클리어 수는 이 타입에 자리가 없습니다.

export type ProfileItemId = "name" | "email" | "phone" | "learning-language";

export type ProfileItem = {
  readonly id: ProfileItemId;
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
