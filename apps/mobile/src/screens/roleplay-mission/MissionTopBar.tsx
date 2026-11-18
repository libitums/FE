import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import { missionTestIds as ids } from "./mission-test-ids";
import type { MissionGoalState } from "./roleplay-mission.contract";

import "./roleplay-mission-talk.css";

export type MissionTopBarProps = {
  readonly insetTop: number;
  readonly title: string;
  readonly imageUrl: string | null;
  readonly goals: readonly MissionGoalState[];
  readonly turnsLeft: number;
  readonly onQuit: () => void;
};

/**
 * 대화 화면의 위 띠입니다 — 장면 그림(작게, 그늘 아래) · 그만두기 · 제목과 남은 턴 · 목표 체크리스트(필수/선택).
 * 머리는 롤플레이 대화의 머리와 같은 단추 · 글꼴이고, 목표 줄은 새로 그린 임시 구성입니다(스펙 「디자인 확인 필요」).
 */
export function MissionTopBar({
  insetTop,
  title,
  imageUrl,
  goals,
  turnsLeft,
  onQuit,
}: MissionTopBarProps): ReactNode {
  const copy = useUiCopy().roleplayMission;
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  return (
    <view className="mission-talk-top" style={{ paddingTop: `${String(insetTop)}px` }}>
      <view className="mission-talk-scene" accessibility-elements-hidden={true}>
        {imageUrl === null ? null : (
          <NarrativeBackground
            src={imageUrl}
            previousSrc={null}
            animated={false}
            reducedMotion={reducedMotion}
          />
        )}
        <view className="mission-talk-scene-shade" />
      </view>
      <view className="mission-talk-header">
        <view data-testid={ids.talkQuit}>
          <RoundButton
            accessibilityLabel={copy.quit}
            icon={arrowLeft03}
            variant="neutral"
            size="l"
            bindtap={onQuit}
          />
        </view>
        <view className="mission-talk-header-text">
          <text
            className="mission-talk-title"
            data-testid={ids.talkTitle}
            accessibility-traits="header"
            text-maxline="1"
          >
            {title}
          </text>
          <text className="mission-talk-turns" data-testid={ids.turnsLeft}>
            {copy.turnsLeft(turnsLeft)}
          </text>
        </view>
      </view>
      <scroll-view
        className="mission-goals-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="mission-goals" data-testid={ids.goals}>
          {goals.map((goal) => (
            <view
              key={goal.id}
              className="mission-goal"
              data-testid={ids.goal(goal.id)}
              data-done={goal.done ? "true" : "false"}
              accessibility-element={true}
              accessibility-label={copy.goalSpoken(goal.label.en, goal.required, goal.done)}
            >
              <view className={`mission-goal-mark${goal.done ? " mission-goal-mark-done" : ""}`}>
                {goal.done ? (
                  <svg className="mission-goal-icon" content={tick} current-color={color.white} />
                ) : null}
              </view>
              <text className="mission-goal-label">{goal.label.en}</text>
              <text className="mission-goal-tag">
                {goal.required ? copy.required : copy.optional}
              </text>
            </view>
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
