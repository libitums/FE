import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { coinIcon } from "../../components/coin-icon";
import { useUiCopy } from "../../lib/ui-copy";
import { LaunchCoinFlight } from "../launch/LaunchCoinFlight";
import type { StreakMilestone, StreakSlotTag } from "./streak-rewards";
import {
  streakRewardCoinSourceId,
  streakRewardFlightLayerId,
  streakRewardTestIds as ids,
} from "./streak-reward.contract";

import "./streak-reward.css";

// 연속 학습 모달의 엽전 보상 조각들(ADR-0143, 시안 3판 「스트릭」 탭) — 칸 위 꼬리표 · 큰 목표 줄 · 남은 날 문구 · 보상 카드 +
// Collect. 그리기만 하고 세지 않습니다(`streak-rewards.ts`). `animate`가 거짓(움직임 줄이기)이면 등장 움직임 클래스를 붙이지 않습니다.

const enter = (animate: boolean, name: string): string => (animate ? ` ${name}` : "");

/** 칸 위 꼬리표 줄 — 요일 줄과 칸 줄 사이에 겹쳐 서고(자리를 차지하지 않음), 낭독하지 않습니다(문구가 다음 보상을 말함). */
export function StreakTagRow(props: {
  readonly tags: readonly (StreakSlotTag | null)[];
  readonly animate: boolean;
}): ReactNode {
  return (
    <view className="journey-stat-modal-tags" accessibility-elements-hidden={true}>
      {props.tags.map((tag, index) => (
        <view className="journey-stat-modal-tag-cell" key={index}>
          {tag === null ? null : (
            <view className="journey-stat-modal-tag-anchor">
              <view
                className={`journey-stat-modal-tag journey-stat-modal-tag-${tag.kind}${enter(props.animate, "journey-stat-modal-tag-enter")}`}
                data-testid={ids.tag(index)}
                data-kind={tag.kind}
                accessibility-elements-hidden={true}
              >
                {tag.kind === "earned" ? (
                  <svg
                    className="journey-stat-modal-tag-icon"
                    content={tick}
                    current-color={color.white}
                  />
                ) : (
                  <svg className="journey-stat-modal-tag-icon" content={coinIcon} />
                )}
                <text className="journey-stat-modal-tag-text">{`+${tag.amount}`}</text>
              </view>
            </view>
          )}
        </view>
      ))}
    </view>
  );
}

/** 큰 목표 줄 — 이번 줄 뒤의 첫 이정표와 차오르는 막대. 한 요소로 낭독합니다. */
export function StreakGoal(props: {
  readonly goal: StreakMilestone & { readonly ratio: number };
  readonly animate: boolean;
}): ReactNode {
  const copy = useUiCopy().journeyMap.statModal.reward;
  const { goal } = props;
  return (
    <view
      className="journey-stat-modal-goal"
      data-testid={ids.goal}
      flatten={false}
      accessibility-element={true}
      accessibility-label={copy.goalSpoken(goal.day, goal.amount)}
    >
      <view className="journey-stat-modal-goal-row">
        <text className="journey-stat-modal-goal-label">{copy.goal(goal.day)}</text>
        <view className="journey-stat-modal-goal-value">
          <svg className="journey-stat-modal-goal-coin" content={coinIcon} />
          <text className="journey-stat-modal-goal-amount">{`+${goal.amount}`}</text>
        </view>
      </view>
      <view className="journey-stat-modal-goal-bar">
        <view
          className={`journey-stat-modal-goal-fill${enter(props.animate, "journey-stat-modal-goal-fill-enter")}`}
          data-testid={ids.goalFill}
          style={{ width: `${goal.ratio * 100}%` }}
        />
      </view>
    </view>
  );
}

/** 「Amazing work! 2 more days to +40 Yeopjeon.」 — 남은 날만 색이 다릅니다. */
export function StreakRewardMessage(props: {
  readonly next: StreakMilestone & { readonly left: number };
  readonly animate: boolean;
}): ReactNode {
  const copy = useUiCopy().journeyMap.statModal.reward;
  const gap = copy.spaced ? " " : "";
  return (
    <text
      className={`journey-stat-modal-message journey-stat-modal-message-tight${enter(props.animate, "journey-stat-modal-message-enter")}`}
      data-testid="journey-stat-modal-message"
    >
      {`${copy.lead}${gap}`}
      <text className="journey-stat-modal-message-em">{copy.moreDays(props.next.left)}</text>
      {`${gap}${copy.toReward(props.next.amount)}`}
    </text>
  );
}

/** 보상 날의 카드와 Collect — 카드의 엽전이 날기의 출발점입니다. */
export function StreakRewardCard(props: {
  readonly days: number;
  readonly amount: number;
  readonly animate: boolean;
  readonly onCollect: () => void;
}): ReactNode {
  const copy = useUiCopy().journeyMap.statModal.reward;
  const collect = () => {
    "background only";
    props.onCollect();
  };
  return (
    <>
      <view
        className={`journey-stat-modal-card${enter(props.animate, "journey-stat-modal-card-enter")}`}
        data-testid={ids.card}
        flatten={false}
        accessibility-element={true}
        accessibility-label={copy.rewardSpoken(props.days, props.amount)}
      >
        <view className="journey-stat-modal-card-amount">
          <svg
            id={streakRewardCoinSourceId}
            className="journey-stat-modal-card-coin"
            content={coinIcon}
          />
          <text className="journey-stat-modal-card-value">{`+${props.amount}`}</text>
        </view>
        <text className="journey-stat-modal-card-title">{copy.rewardTitle(props.days)}</text>
      </view>
      <view
        className="journey-stat-modal-footer journey-stat-modal-footer-fill"
        data-testid={ids.collect}
      >
        <Button label={copy.collect} variant="brand" size="xl" width="fill" bindtap={collect} />
      </view>
    </>
  );
}

/** Collect 뒤 날기 층 — 걷히는 모달 바로 위에서 카드 엽전 → 머리 엽전 칩(엽전 출시 모달의 날기를 그대로 씀, 안전 타이머 포함). */
export function StreakRewardFlight(props: {
  readonly targetId: string;
  readonly onLanded: (landed: number) => void;
}): ReactNode {
  return (
    <view className="journey-stat-modal-flight" data-testid={ids.flight}>
      <LaunchCoinFlight
        targetId={props.targetId}
        sourceId={streakRewardCoinSourceId}
        layerId={streakRewardFlightLayerId}
        onLanded={props.onLanded}
      />
    </view>
  );
}
