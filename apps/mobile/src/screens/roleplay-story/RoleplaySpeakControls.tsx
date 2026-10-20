import type { ReactNode } from "@lynx-js/react";

import mic from "@libitums/icons/lynx/mic";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import type { RoleplayTalkPhase } from "./roleplay-story.contract";

export type RoleplaySpeakControlsProps = {
  readonly phase: RoleplayTalkPhase;
  /** 펼친 힌트(내가 할 말의 뜻). 접혀 있으면 `null`입니다. */
  readonly hint: string | null;
  readonly canShowHint: boolean;
  readonly onMic: () => void;
  readonly onHint: () => void;
  readonly onSkip: () => void;
};

/**
 * 말하기 묶음입니다 — 바탕 면 없이 장면 위에 바로 섭니다(시안 「진행 1」). 마이크는 누르면 듣고, 듣는 중에
 * 다시 누르면 멈춥니다. 「Can't speak now」는 판정 없이 이 턴을 넘깁니다(듣는 중에는 받지 않습니다).
 */
export function RoleplaySpeakControls({
  phase,
  hint,
  canShowHint,
  onMic,
  onHint,
  onSkip,
}: RoleplaySpeakControlsProps): ReactNode {
  const copy = useUiCopy();
  const listening = phase === "listening";
  const micLabel = listening ? copy.roleplayStory.stop : copy.roleplayStory.speak;
  return (
    <view className="roleplay-story-speak">
      {hint === null ? null : (
        <text className="roleplay-story-hint" data-testid="roleplay-talk-hint">
          {copy.roleplayStory.hint(hint)}
        </text>
      )}
      {phase === "unavailable" ? (
        <text className="roleplay-story-hint" data-testid="roleplay-talk-unavailable">
          {copy.roleplayStory.unavailable}
        </text>
      ) : null}
      <view
        className={`roleplay-story-mic roleplay-story-mic-${phase}`}
        data-testid="roleplay-talk-mic"
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={micLabel}
        bindtap={onMic}
      >
        <svg className="roleplay-story-mic-icon" content={mic} current-color={color.white} />
      </view>
      <text className="roleplay-story-mic-label" accessibility-elements-hidden={true}>
        {listening ? copy.roleplayStory.listening : micLabel}
      </text>
      <view className="roleplay-story-links">
        {canShowHint ? (
          <text
            className="roleplay-story-link roleplay-story-link-hint"
            data-testid="roleplay-talk-show-hint"
            accessibility-traits="button"
            bindtap={onHint}
          >
            {copy.roleplayStory.showHint}
          </text>
        ) : (
          <view />
        )}
        <text
          className="roleplay-story-link"
          data-testid="roleplay-talk-skip"
          accessibility-traits="button"
          bindtap={listening ? undefined : onSkip}
        >
          {copy.roleplayStory.cantSpeak}
        </text>
      </view>
    </view>
  );
}
