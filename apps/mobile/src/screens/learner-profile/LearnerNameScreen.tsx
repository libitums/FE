import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import dice from "@libitums/icons/lynx/dice";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { EntryStepBar } from "../../components/EntryStepBar";
import { announce } from "../../lib/accessibility";
import { LEARNER_NAME_MAX_LENGTH, learnerNameFrom } from "../../lib/learner-profile";
import { playSound } from "../../lib/sound-effects";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import type { LearnerNameScreenProps } from "./learner-profile-screens.contract";

import "../login/login-screen.css";
import "../vocab-card/vocab-card-activity.css";
import "./learner-signup-screen.css";

// 가입 직후 ① 이름입니다(언어 선택과 같은 틀 — 캔버스 ProfName). 이름 칸은 미리 채워 서고, Shuffle이 다른 무작위
// 이름으로 바꿉니다. 건너뛰기는 없습니다 — 이름이 늘 있어야 레슨 대사의 `{이름}`이 찹니다.
export function LearnerNameScreen({
  initialName,
  port,
  onContinue,
  onBack,
}: LearnerNameScreenProps): ReactNode {
  const copy = useUiCopy().learnerProfile;
  const [name, setName] = useState(initialName);
  // 빈 채 Continue를 누른 뒤에만 빈 이름 오류가 섭니다. 금지 문자 · 길이는 치는 즉시.
  const [noticed, setNoticed] = useState(false);
  // 입력 칸이 비제어라 Shuffle은 키를 바꿔 새 이름으로 다시 세웁니다.
  const [shuffles, setShuffles] = useState(0);
  useScreenBack(onBack);

  const checked = learnerNameFrom(name);
  const issue = checked.ok ? null : checked.issue;
  const shownIssue = issue === null || (issue === "empty" && !noticed) ? null : issue;
  const preview = port.previewOf(checked.ok ? checked.name : null, null);

  function handleShuffle() {
    playSound("button");
    setName(port.randomName(checked.ok ? checked.name : null));
    setNoticed(false);
    setShuffles(shuffles + 1);
  }

  function handleContinue() {
    playSound("button");
    if (checked.ok) {
      onContinue(checked.name);
      return;
    }
    setNoticed(true);
    announce(copy.nameIssue[checked.issue]);
  }

  return (
    <view className="learner-signup-screen" data-testid="learner-name-screen">
      <view className="learner-signup-header">
        <view data-testid="learner-name-screen-back">
          <RoundButton
            accessibilityLabel={copy.signup.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onBack}
          />
        </view>
        <EntryStepBar current={1} total={3} />
      </view>

      <scroll-view
        className="learner-signup-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="learner-signup-content">
          <view className="learner-profile-heading">
            <text
              className="learner-profile-title"
              data-testid="learner-name-screen-title"
              flatten={false}
              accessibility-element={true}
              accessibility-heading={true}
              accessibility-traits="header"
            >
              {copy.signup.name.title}
            </text>
            <text className="learner-profile-caption" flatten={false} accessibility-element={true}>
              {copy.signup.name.caption}
            </text>
          </view>

          <view className="learner-signup-name-row">
            <view className="learner-signup-name-field" data-testid="learner-name-screen-field">
              <TextField
                key={shuffles}
                label={copy.nameLabel}
                purpose="text"
                defaultValue={name}
                counter={{ maxLength: LEARNER_NAME_MAX_LENGTH }}
                supporting={
                  shownIssue === null
                    ? { kind: "helper", message: copy.signup.name.helper }
                    : { kind: "error", message: copy.nameIssue[shownIssue] }
                }
                bindinput={(value) => {
                  setName(value);
                  setNoticed(false);
                }}
              />
            </view>
            {/* 보이는 「Shuffle」보다 하는 일을 말하는 이름으로 읽힙니다 — 버튼 하나를 접근성 요소 하나로 감쌉니다. */}
            <view
              className="learner-signup-shuffle"
              data-testid="learner-name-screen-shuffle"
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={copy.signup.name.shuffleLabel}
              bindtap={handleShuffle}
            >
              <view accessibility-elements-hidden={true}>
                <Button
                  label={copy.signup.name.shuffle}
                  variant="subtle"
                  size="m"
                  width="hug"
                  icon={dice}
                  iconPosition="leading"
                />
              </view>
            </view>
          </view>

          {preview.kind !== "yours" ? null : (
            <view
              className="learner-profile-preview"
              data-testid="learner-name-screen-preview"
              flatten={false}
              accessibility-element={true}
              accessibility-label={copy.preview.label(
                "yours",
                preview.lines.map((line) => line.ko).join(" "),
                preview.lines.map((line) => line.en).join(" "),
              )}
            >
              <text className="learner-profile-preview-title" accessibility-element={false}>
                {copy.signup.name.previewHeading}
              </text>
              {preview.lines.flatMap((line) => [
                <text
                  key={`ko-${line.ko}`}
                  className="learner-profile-preview-text"
                  accessibility-element={false}
                >
                  {line.ko}
                </text>,
                <text
                  key={`en-${line.ko}`}
                  className="learner-profile-preview-translation"
                  accessibility-element={false}
                >
                  {line.en}
                </text>,
              ])}
            </view>
          )}
        </view>
      </scroll-view>

      <view className="learner-signup-footer" data-testid="learner-name-screen-next">
        <Button
          label={copy.signup.continue}
          variant="brand"
          size="xl"
          width="fill"
          icon={arrowRight}
          iconPosition="trailing"
          bindtap={handleContinue}
        />
      </view>
    </view>
  );
}
