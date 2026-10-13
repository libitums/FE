import type { ReactNode } from "@lynx-js/react";

import type { LearnerProfileSettingsScreenProps } from "./learner-profile-screens.contract";

// 설정 탭에서 학습자 이름 · 나라를 고치는 화면입니다.
export function LearnerProfileSettingsScreen(_props: LearnerProfileSettingsScreenProps): ReactNode {
  return <view data-testid="learner-profile-screen" />;
}
