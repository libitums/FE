import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";
import { StatusIndicator } from "@libitums/ui-lynx/status-indicator";

import "./onboarding-unit-card.css";

// 셋째 스텝의 학습 유닛이 「학습 중」에서 「완료」로 바뀌기까지의 시간입니다.
const unitClearDelayMs = 1500;

/**
 * 온보딩 셋째 스텝의 학습 유닛 카드를 그립니다. 들어오면 학습 중으로 보이다가
 * 잠시 뒤 완료로 바뀝니다(시연용). 이 상태는 이 컴포넌트가 소유합니다 — 스텝을
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
          <view className="onboarding-screen-unit">
            <StatusIndicator
              status={unitCleared ? "completed" : "in-progress"}
              label={unitCleared ? "Clear" : "Learning"}
              statusName={unitCleared ? "Completed" : "In progress"}
            />
            <text className="onboarding-screen-unit-title">Shopping at a beauty store</text>
            <text className="onboarding-screen-unit-meta">Unit 1 · 5 min</text>
          </view>
        </Card.Content>
      </Card>
    </view>
  );
}
