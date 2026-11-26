import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
import { useScreenBack } from "../../lib/use-back-handler";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import { missionPriceLine } from "./mission-model";
import { missionTestIds as ids } from "./mission-test-ids";
import type { MissionPreviewScreenProps } from "./roleplay-mission.contract";

import "../roleplay-story/roleplay-story-screen.css";
import "./roleplay-mission-talk.css";
import "./roleplay-mission-preview.css";

/**
 * 미션의 미리보기입니다(PRD §4.1) — 롤플레이 미리보기와 같은 틀(장면 그림 · 머리 · 아래 다이얼로그 · 주 버튼)에
 * 상대역 · 턴 상한 · 목표 수 알약, 목표 목록, 이번 판의 값(무료 횟수 / 엽전 정액 · 잔액)을 싣습니다.
 */
export function MissionPreviewScreen({
  insets,
  card,
  starting,
  startError,
  onStart,
  onExit,
}: MissionPreviewScreenProps): ReactNode {
  const copy = useUiCopy();
  const mission = useMissionCopy();
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  useScreenBack(onExit);
  const { item, price } = card;
  const chips = [
    mission.withCounterpart(item.counterpartLabel),
    mission.turnLimit(item.turnLimit),
    mission.goalCount(item.goals.length),
  ];
  const subtitle =
    item.best === null ? mission.form : `${mission.form} · ${mission.best(item.best.totalScore)}`;

  return (
    <view
      className="roleplay-story-screen"
      data-testid={ids.preview}
      data-statusbar={lightStatusBarIcons}
    >
      <view className="roleplay-story-screen-backdrop" />
      <view className="roleplay-story-screen-scene" accessibility-elements-hidden={true}>
        {card.imageUrl === null ? null : (
          <NarrativeBackground
            src={card.imageUrl}
            previousSrc={null}
            animated={false}
            reducedMotion={reducedMotion}
          />
        )}
        <view className="roleplay-story-screen-shade" />
      </view>
      <view
        className="roleplay-story-screen-safe"
        flatten={false}
        style={{
          paddingTop: `${String(insets.top)}px`,
          paddingBottom: `${String(insets.bottom)}px`,
          paddingLeft: `${String(insets.left)}px`,
          paddingRight: `${String(insets.right)}px`,
        }}
      >
        <view className="roleplay-story-screen-header">
          <view data-testid={ids.previewBack}>
            <RoundButton
              accessibilityLabel={copy.common.exitTo.roleplay}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={onExit}
            />
          </view>
          <view className="roleplay-story-screen-header-text">
            <text
              className="roleplay-story-screen-title"
              data-testid={ids.previewTitle}
              accessibility-traits="header"
            >
              {item.title.en}
            </text>
            <text className="roleplay-story-screen-progress">
              {card.ordinal === null
                ? subtitle
                : `${copy.catalogMap.episodeLabel(card.ordinal)} · ${subtitle}`}
            </text>
          </view>
        </view>

        <view className="roleplay-story-screen-spacer" />

        <view className="roleplay-story-screen-bottom roleplay-story-screen-bottom-fit">
          <scroll-view
            className="mission-preview-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            <view className="roleplay-story-screen-bottom" style={{ padding: "0px" }}>
              <view className="roleplay-story-chips" data-testid={ids.previewChips}>
                {chips.map((chip) => (
                  <text key={chip} className="roleplay-story-chip">
                    {chip}
                  </text>
                ))}
              </view>
              <view
                accessibility-element={true}
                accessibility-label={mission.previewBody(item.counterpartLabel)}
              >
                <view accessibility-elements-hidden={true}>
                  <VisualNovelDialog
                    variant="narration"
                    line={mission.previewBody(item.counterpartLabel)}
                    reveal="instant"
                    continueIndicator="off"
                    surface="opaque"
                    contentLanguage="ui"
                    reducedMotion={reducedMotion}
                  />
                </view>
              </view>
              <view className="mission-preview-goals" data-testid={ids.previewGoals}>
                <text className="mission-preview-goals-title" accessibility-traits="header">
                  {mission.goalsTitle}
                </text>
                {item.goals.map((goal) => (
                  <view
                    key={goal.id}
                    className="mission-goal"
                    accessibility-element={true}
                    accessibility-label={`${goal.label.en}, ${goal.required ? mission.required : mission.optional}`}
                  >
                    <view className="mission-goal-mark">
                      <svg
                        className="mission-goal-icon"
                        content={tick}
                        current-color={color.white}
                      />
                    </view>
                    <text className="mission-goal-label">{goal.label.en}</text>
                    <text className="mission-goal-tag">
                      {goal.required ? mission.required : mission.optional}
                    </text>
                  </view>
                ))}
              </view>
            </view>
          </scroll-view>
          <text className="mission-preview-line" data-testid={ids.previewPrice}>
            {missionPriceLine(price, mission)}
          </text>
          {startError === null ? null : (
            <text
              className="mission-preview-line mission-preview-error"
              data-testid={ids.previewError}
              data-code={startError}
            >
              {mission.startError[startError]}
            </text>
          )}
          <view data-testid={ids.previewStart}>
            <Button
              label={starting ? mission.starting : mission.start}
              variant="brand"
              size="xl"
              width="fill"
              loading={starting}
              disabled={!item.unlocked}
              bindtap={onStart}
            />
          </view>
        </view>
      </view>
    </view>
  );
}
