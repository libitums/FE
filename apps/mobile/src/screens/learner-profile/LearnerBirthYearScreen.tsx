import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { EntryStepBar } from "../../components/EntryStepBar";
import { birthYearOptions, birthYearScrollIndex } from "../../lib/birth-year-options";
import { playSound } from "../../lib/sound-effects";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import type { LearnerBirthYearScreenProps } from "./learner-profile-screens.contract";

import "../login/login-screen.css";
import "../vocab-card/vocab-card-activity.css";
import "./learner-signup-screen.css";

// 가입 직후 ④ 출생 연도입니다(ADR-0059 · ADR-0125 개정 2026-11-27). 메신저 생년 시트와 같은 목록 규칙 — 올해 → 100년 전,
// 가운데(50년 전)에서 열고 어느 줄도 미리 고르지 않으며, 고르기 전에는 Continue가 꺼져 있습니다. 건너뛰기는 없습니다.
// COPPA 중립 연령 확인: 성인 연도를 미리 고르지 않고, 「어리면 못 쓴다」는 안내를 고르기 전에 보이지 않습니다.
export function LearnerBirthYearScreen({
  onContinue,
  onBack,
}: LearnerBirthYearScreenProps): ReactNode {
  const copy = useUiCopy().learnerProfile;
  const step = copy.signup.birthYear;
  // 처음 열 때 한 번만 정합니다 — 고르는 동안 목록이 따라 움직이지 않습니다.
  const [years] = useState(() => birthYearOptions(Date.now()));
  const [scrollIndex] = useState(() => birthYearScrollIndex(years, null));
  const [selected, setSelected] = useState<number | null>(null);
  useScreenBack(onBack);

  function handleContinue() {
    if (selected === null) return;
    playSound("button");
    onContinue(selected);
  }

  return (
    <view className="learner-signup-screen" data-testid="learner-birth-year-screen">
      <view className="learner-signup-header">
        <view data-testid="learner-birth-year-screen-back">
          <RoundButton
            accessibilityLabel={copy.signup.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onBack}
          />
        </view>
        <EntryStepBar current={4} total={4} />
      </view>

      <view className="learner-profile-heading">
        <text
          className="learner-profile-title"
          data-testid="learner-birth-year-screen-title"
          flatten={false}
          accessibility-element={true}
          accessibility-heading={true}
          accessibility-traits="header"
        >
          {step.title}
        </text>
        <text className="learner-profile-caption" flatten={false} accessibility-element={true}>
          {step.caption}
        </text>
      </view>

      {/* 스크롤 칸에 낭독 이름을 달지 않습니다 — Android는 이름 있는 scroll-view를 요소 하나로 묶어 안의 줄을 숨겼습니다(ADR-0125). */}
      <scroll-view
        className="learner-signup-list"
        data-testid="learner-birth-year-screen-list"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        initial-scroll-to-index={scrollIndex}
      >
        {years.map((year) => {
          const on = year === selected;
          return (
            <view
              key={year}
              className={`learner-signup-row learner-birth-year-row${on ? " learner-signup-row-selected" : ""}`}
              data-testid={`learner-birth-year-screen-row-${year}`}
              data-selected={on ? "true" : "false"}
              flatten={false}
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={on ? `${year}, selected` : String(year)}
              accessibility-enable-tap={true}
              bindtap={() => setSelected(year)}
            >
              <text className="learner-signup-row-label" accessibility-element={false}>
                {String(year)}
              </text>
              {on ? (
                <svg
                  className="learner-signup-row-check"
                  content={tick}
                  current-color={color.brand.primary}
                />
              ) : null}
            </view>
          );
        })}
      </scroll-view>

      <view className="learner-signup-footer">
        <view data-testid="learner-birth-year-screen-next">
          <Button
            label={copy.signup.continue}
            variant="brand"
            size="xl"
            width="fill"
            icon={arrowRight}
            iconPosition="trailing"
            disabled={selected === null}
            bindtap={handleContinue}
          />
        </view>
      </view>
    </view>
  );
}
