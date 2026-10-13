import type { ReactNode } from "@lynx-js/react";

import type { LearnerProfileFieldsProps } from "./learner-profile.contract";

// 양식 묶음입니다 — 미리보기 상자 → 이름 칸 → 나라 줄.
export function LearnerProfileFields(_props: LearnerProfileFieldsProps): ReactNode {
  return <view data-testid="learner-profile-fields" />;
}
