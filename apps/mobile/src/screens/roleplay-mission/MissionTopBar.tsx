import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import mute from "@libitums/icons/lynx/mute";
import tick from "@libitums/icons/lynx/tick";
import volume from "@libitums/icons/lynx/volume";
import { color } from "@libitums/design-tokens";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
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
  /** 필수 목표를 다 이뤘다(성공 확정) — 남은 턴 뒤에 「Mission success」가 붙고 카드를 닫아도 남습니다. */
  readonly success: boolean;
  /** 상대역 말 자동 재생 — 머리 오른쪽 스피커 토글(켬 = 스피커, 끔 = 음소거). */
  readonly autoPlay: boolean;
  readonly onToggleAutoPlay: () => void;
  readonly onQuit: () => void;
};

/**
 * 대화 화면의 위 띠입니다 — 장면 그림(작게, 그늘 아래) · 그만두기 · 제목과 남은 턴(성공 확정이면 성공 표시) · 목표 체크리스트(필수/선택).
 * 머리는 롤플레이 대화의 머리와 같은 단추 · 글꼴이고, 목표 줄은 새로 그린 임시 구성입니다(스펙 「디자인 확인 필요」).
 */
export function MissionTopBar({
  insetTop,
  title,
  imageUrl,
  goals,
  turnsLeft,
  success,
  autoPlay,
  onToggleAutoPlay,
  onQuit,
}: MissionTopBarProps): ReactNode {
  const ui = useUiCopy();
  const copy = useMissionCopy();
  const autoPlayState = autoPlay ? ui.settings.optionState.on : ui.settings.optionState.off;
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
          <text
            className="mission-talk-turns"
            data-testid={ids.turnsLeft}
            data-success={success ? "true" : "false"}
          >
            {success
              ? `${copy.turnsLeft(turnsLeft)} · ${copy.extra.success.mark}`
              : copy.turnsLeft(turnsLeft)}
          </text>
        </view>
        <view data-testid={ids.autoPlay} data-on={autoPlay ? "true" : "false"}>
          <RoundButton
            accessibilityLabel={`${copy.extra.voice.autoPlay}, ${autoPlayState}`}
            icon={autoPlay ? volume : mute}
            variant="neutral"
            size="l"
            bindtap={onToggleAutoPlay}
          />
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
