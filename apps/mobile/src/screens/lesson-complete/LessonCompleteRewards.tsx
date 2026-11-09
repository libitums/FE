import type { ReactNode } from "@lynx-js/react";

import trophy from "@libitums/icons/lynx/trophy";
import { color } from "@libitums/design-tokens";

import { coinIcon } from "../../components/coin-icon";
import { useUiCopy } from "../../lib/ui-copy";
import type { LessonReward } from "./lesson-complete";
import { lessonCompleteRiseClassName } from "./lesson-complete-reward";
import type { RewardMotion } from "./lesson-complete-reward";
import { coinFlightSourceId } from "./LessonCompleteCoinFlight";

// 결과 화면의 보상 카드 줄입니다 — 엽전(ADR-0116) · 등급. 읽기 전용이고 카드마다 한 요소로 묶어 이름을 답니다.
// 화면이 미통과에서는 이 줄을 세우지 않습니다. **엽전 카드는 받은 엽전이 있을 때만 섭니다**(처음 통과) — 다시 하기의
// 「+ 0」은 얻지 않은 것을 그리는 것이라 등급 카드만 남습니다. 엽전 아이콘은 날아가는 엽전의 출발점(`id`)입니다.

export function LessonCompleteRewards({
  reward,
  rewardMotion,
}: {
  readonly reward: LessonReward;
  readonly rewardMotion: RewardMotion;
}): ReactNode {
  const copy = useUiCopy();
  const lc = copy.lessonComplete;
  const gradeName = lc.gradeName(reward.grade);
  return (
    <view
      className={[
        "lesson-complete-screen-rewards",
        lessonCompleteRiseClassName(rewardMotion, "rewards"),
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {reward.coinAmount > 0 ? (
        <view
          className="lesson-complete-screen-reward lesson-complete-screen-reward-coins"
          data-testid="lesson-complete-screen-reward-coins"
          accessibility-element={true}
          accessibility-label={lc.rewardCoins(reward.coinAmount)}
        >
          <svg
            id={coinFlightSourceId}
            className="lesson-complete-screen-reward-icon"
            content={coinIcon}
          />
          <text className="lesson-complete-screen-reward-label">
            {lc.rewardLabel(reward.coinAmount)}
          </text>
        </view>
      ) : null}
      <view
        className="lesson-complete-screen-reward lesson-complete-screen-reward-grade"
        data-testid="lesson-complete-screen-reward-grade"
        accessibility-element={true}
        accessibility-label={lc.grade(gradeName)}
      >
        <svg
          className="lesson-complete-screen-reward-icon"
          content={trophy}
          current-color={color.feedback.warning}
        />
        <text className="lesson-complete-screen-reward-label">{gradeName}</text>
      </view>
    </view>
  );
}
