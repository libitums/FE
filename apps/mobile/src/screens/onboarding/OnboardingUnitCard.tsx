import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import play from "@libitums/icons/lynx/play";
import { Card } from "@libitums/ui-lynx/card";
import { LearningUnit } from "@libitums/ui-lynx/learning-unit";

import "./onboarding-unit-card.css";

// 셋째 스텝의 학습 유닛이 「학습 중」에서 「완료」로 바뀌기까지의 시간입니다.
const unitClearDelayMs = 1500;

const unitTitle = "Shopping at a beauty store";

/**
 * 온보딩 셋째 스텝의 학습 유닛 카드를 그립니다. 카드 안은 여정 맵과 같은 ui-lynx
 * `LearningUnit` 표식입니다 — 들어오면 학습 중(`active`)으로 보이다가 잠시 뒤
 * 완료(`clear`)로 바뀝니다(시연용). 이 상태는 이 컴포넌트가 소유합니다 — 스텝을
 * 떠나 언마운트되면 함께 초기화됩니다.
 */
export function OnboardingUnitCard(): ReactNode {
  const [unitCleared, setUnitCleared] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setUnitCleared(true), unitClearDelayMs);
    return () => clearTimeout(timer);
  }, []);

  return (
    <view className="onboarding-screen-unit-area" data-testid="onboarding-screen-unit">
      <Card>
        <Card.Content>
          {/* 시연 카드라 누를 것이 없습니다. `LearningUnit`은 `active` · `clear`에서
              버튼으로 낭독되고 상태 접미사가 한국어라, 표식은 낭독에서 가리고 이 상자가
              화면 문구와 같은 영어로 이름을 집니다. */}
          <view
            className="onboarding-screen-unit"
            data-testid="onboarding-screen-unit-content"
            data-status={unitCleared ? "clear" : "active"}
            accessibility-element={true}
            accessibility-label={`${unitTitle}, ${unitCleared ? "Clear" : "Learning"}`}
          >
            <view accessibility-elements-hidden={true}>
              <LearningUnit
                id="onboarding"
                accessibilityLabel={unitTitle}
                icon={play}
                status={unitCleared ? "clear" : "active"}
              />
            </view>
            <text className="onboarding-screen-unit-title">{unitTitle}</text>
            <text className="onboarding-screen-unit-meta">Unit 1 · 5 min</text>
          </view>
        </Card.Content>
      </Card>
    </view>
  );
}
