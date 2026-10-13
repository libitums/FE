import type { ReactNode } from "@lynx-js/react";

import type { LearnerCountryPickerProps } from "./learner-profile.contract";

// 나라 고르기입니다 — 양식 자리에 대신 서서 검색하고 하나를 고르게 합니다.
export function LearnerCountryPicker(_props: LearnerCountryPickerProps): ReactNode {
  return <view data-testid="learner-country-picker" />;
}
