import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { LearnerProfileFields } from "../../components/LearnerProfileFields";
import { LearnerProfileFrame } from "../../components/LearnerProfileFrame";
import { useLearnerProfileForm } from "../../components/use-learner-profile-form";
import { announce } from "../../lib/accessibility";
import { sameLearnerProfile } from "../../lib/learner-profile";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import type { LearnerProfileSettingsScreenProps } from "./learner-profile-screens.contract";

import "../login/login-screen.css";

// 설정 탭에서 학습자 이름 · 나라를 고치는 화면입니다. 뒤로는 고친 것을 버리고 설정으로 돌아갑니다. 이름과
// 나라가 둘 다 있어야 저장되고, 기존 기록을 지우는 길은 없습니다.
export function LearnerProfileSettingsScreen({
  record,
  port,
  onSubmit,
  onExit,
}: LearnerProfileSettingsScreenProps): ReactNode {
  const copy = useUiCopy();
  const form = useLearnerProfileForm({
    initial: record,
    port,
    emptyMessage: copy.learnerProfile.nameIssue.empty,
  });
  useScreenBack(onExit);

  function handleSubmit() {
    const status = form.submit();
    if (status.kind === "ready") {
      if (!sameLearnerProfile(record, status.record)) announce(copy.learnerProfile.settings.saved);
      onSubmit(status.record);
    } else if (status.kind !== "invalid") {
      form.noticeIncomplete();
    }
  }

  return (
    <view className="learner-profile-screen" data-testid="learner-profile-screen">
      <LearnerProfileFrame
        form={form}
        header={
          form.draft.view === "picker" ? null : (
            <view data-testid="learner-profile-screen-back">
              <RoundButton
                accessibilityLabel={copy.common.backToSettings}
                icon={arrowLeft}
                variant="neutral"
                size="xl"
                bindtap={onExit}
              />
            </view>
          )
        }
        footer={
          <view data-testid="learner-profile-screen-submit">
            <Button
              label={copy.learnerProfile.settings.submit}
              variant="neutral"
              size="xl"
              width="fill"
              bindtap={handleSubmit}
            />
          </view>
        }
      >
        <view className="learner-profile-heading">
          <text
            className="learner-profile-title"
            data-testid="learner-profile-screen-title"
            flatten={false}
            accessibility-element={true}
            accessibility-heading={true}
            accessibility-traits="header"
          >
            {copy.learnerProfile.settings.title}
          </text>
          <text className="learner-profile-caption" flatten={false} accessibility-element={true}>
            {copy.learnerProfile.settings.body}
          </text>
        </view>
        <LearnerProfileFields form={form} />
      </LearnerProfileFrame>
    </view>
  );
}
