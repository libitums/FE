import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { LearnerProfileFields } from "../../components/LearnerProfileFields";
import { LearnerProfileFrame } from "../../components/LearnerProfileFrame";
import { useLearnerProfileForm } from "../../components/use-learner-profile-form";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import type { LearnerProfileGateScreenProps } from "./learner-profile-screens.contract";

import "../login/login-screen.css";

// 이름 · 나라가 드는 에피소드에 들어서기 전에 한 번 서는 입력 화면입니다. 뒤로는 맵으로 돌아가고(건너뜀이
// 아니라 다음에 다시 묻습니다), Skip은 저장 없이 열려던 유닛으로 갑니다.
export function LearnerProfileGateScreen({
  port,
  onSubmit,
  onSkip,
  onCancel,
}: LearnerProfileGateScreenProps): ReactNode {
  const copy = useUiCopy();
  const form = useLearnerProfileForm({
    initial: null,
    port,
    emptyMessage: copy.learnerProfile.nameEmptyOnGate,
  });
  const inPicker = form.draft.view === "picker";
  useScreenBack(onCancel);

  function handleSubmit() {
    const status = form.submit();
    if (status.kind === "ready") onSubmit(status.record);
    else if (status.kind !== "invalid") form.noticeIncomplete();
  }

  // 나라 고르기가 서면 그 화면이 자기 뒤로를 가지므로 머리에는 Skip만 남습니다.
  const header: ReactNode = (
    <>
      {inPicker ? null : (
        <view data-testid="learner-profile-gate-back">
          <RoundButton
            accessibilityLabel={copy.learnerProfile.picker.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onCancel}
          />
        </view>
      )}
      <view className="learner-profile-skip" data-testid="learner-profile-gate-skip">
        <Button label={copy.common.skip} variant="text" size="l" bindtap={onSkip} />
      </view>
    </>
  );

  return (
    <view className="learner-profile-screen" data-testid="learner-profile-gate-screen">
      <LearnerProfileFrame
        form={form}
        header={header}
        footer={
          <view data-testid="learner-profile-gate-submit">
            <Button
              label={copy.learnerProfile.gate.submit}
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
            data-testid="learner-profile-gate-title"
            flatten={false}
            accessibility-element={true}
            accessibility-heading={true}
            accessibility-traits="header"
          >
            {copy.learnerProfile.gate.title}
          </text>
          <text className="learner-profile-caption" flatten={false} accessibility-element={true}>
            {copy.learnerProfile.gate.body}
          </text>
        </view>
        <LearnerProfileFields form={form} />
      </LearnerProfileFrame>
    </view>
  );
}
