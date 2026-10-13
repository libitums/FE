import type { ReactNode } from "@lynx-js/react";

import { LearnerCountryPicker } from "./LearnerCountryPicker";
import type { LearnerProfileFrameProps } from "./learner-profile.contract";

import "../screens/login/login-screen.css";

// 독립 화면의 뼈대입니다 — 고정 머리 · 스크롤 · 고정 주 버튼. 나라 고르기가 서면 뼈대 대신 그것을 그리고,
// 머리 자리의 내용은 나라 고르기의 머리 행 오른쪽 끝으로 옮겨 섭니다.
export function LearnerProfileFrame({
  form,
  header,
  footer,
  children,
}: LearnerProfileFrameProps): ReactNode {
  return (
    <view
      className="learner-profile-frame"
      data-testid="learner-profile-frame"
      data-view={form.draft.view}
    >
      {form.draft.view === "picker" ? (
        <LearnerCountryPicker form={form} trailing={header} />
      ) : (
        <view className="learner-profile-body">
          <view className="learner-profile-header">{header}</view>
          <scroll-view
            className="learner-profile-scroll"
            data-testid="learner-profile-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            <view className="learner-profile-content">{children}</view>
          </scroll-view>
          <view className="learner-profile-footer">{footer}</view>
        </view>
      )}
    </view>
  );
}
