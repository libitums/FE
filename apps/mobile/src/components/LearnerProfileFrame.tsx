import type { ReactNode } from "@lynx-js/react";

import type { LearnerProfileFrameProps } from "./learner-profile.contract";

// 독립 화면의 뼈대입니다 — 고정 머리 · 스크롤 · 고정 주 버튼. 나라 고르기가 서면 뼈대 대신 그것을 그립니다.
export function LearnerProfileFrame({ form }: LearnerProfileFrameProps): ReactNode {
  return <view data-testid="learner-profile-frame" data-view={form.draft.view} />;
}
