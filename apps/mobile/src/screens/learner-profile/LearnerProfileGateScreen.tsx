import type { ReactNode } from "@lynx-js/react";

import type { LearnerProfileGateScreenProps } from "./learner-profile-screens.contract";

// 이름 · 나라가 드는 에피소드에 들어서기 전에 한 번 서는 입력 화면입니다.
export function LearnerProfileGateScreen(_props: LearnerProfileGateScreenProps): ReactNode {
  return <view data-testid="learner-profile-gate-screen" />;
}
