import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { PlansPanel } from "./PlansPanel";
import { YourPlanChip } from "./YourPlanChip";
import { currentPlanOf } from "./plan-change";
import { plansTestIds as ids, type PlansScreenProps } from "./plans.contract";

import "./plans.css";

/**
 * 설정 → Plans(ADR-0144 · ADR-0160 시안 L1) — 상점 Plans 탭과 같은 내용(`PlansPanel`)을 밝은 판으로. 위에 뒤로 화살표와 「Your plan」 카드,
 * 탭 전환은 없습니다. 구매 다리가 꺼져 있으면 계속 · 복원 모두 안내 한 줄로 끝납니다.
 */
export function PlansScreen({ focus, onBack, ...data }: PlansScreenProps): ReactNode {
  useScreenBack(onBack);
  const copy = useUiCopy();
  return (
    <view className="plans-screen" data-testid={ids.screen}>
      <view className="plans-screen-header">
        <view data-testid={ids.back}>
          <RoundButton
            accessibilityLabel={copy.common.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onBack}
          />
        </view>
        <YourPlanChip current={currentPlanOf(data.current ?? null)} />
      </view>
      <PlansPanel {...data} focus={focus} placement="settings" theme="light" />
    </view>
  );
}
