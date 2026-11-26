import type { ReactNode } from "@lynx-js/react";

import mic from "@libitums/icons/lynx/mic";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import type { MicPermissionOptions } from "../../components/mic-permission/use-mic-permission";
import type { MicPermissionContext } from "../../lib/mic-permission-event.contract";
import type { SpeechMissReason, SpeechUnavailableReason } from "../../lib/speech-attempt";
import { useUiCopy } from "../../lib/ui-copy";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { RoleplayTalkPhase } from "./roleplay-story.contract";

export type RoleplaySpeakControlsProps = {
  readonly phase: RoleplayTalkPhase;
  readonly unavailableReason: SpeechUnavailableReason | null;
  /** 못 알아들은 까닭 — `missed`에서만 값이 있습니다(ADR-0181). */
  readonly missedReason: SpeechMissReason | null;
  /** 못 알아들은 뒤 다시 듣는 중이면 Try again 자리가 Stop으로 남습니다. */
  readonly retrying: boolean;
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
/** 듣지 못한 까닭마다 다른 안내 — 받아쓰기 꺼짐은 설정 경로, 권한 · 인식기는 허용 안내, 그 밖 실패는 불가 안내. */
export function unavailableMessage(reason: SpeechUnavailableReason | null, copy: UiCopy): string {
  switch (reason) {
    case "dictation-off":
      return copy.speaking.dictationDisabled;
    case "blocked":
      return copy.roleplayStory.blocked;
    // 마이크 입력 실패 등 — 거부와 다른 문구로 다시 말하기를 권합니다(ADR-0206 D5). 못 알아들음은 `missed`가 따로 집니다.
    case "failed":
      return copy.micPermission.listenFailed;
    case null:
      return copy.roleplayStory.unavailable;
  }
}

/** 같은 턴을 곧바로 다시 말할 수 있는 국면인가 — 못 알아들음 · 인식 실패(ADR-0206 D5). */
export function roleplayRetryable(
  phase: RoleplayTalkPhase,
  reason: SpeechUnavailableReason | null,
): boolean {
  return phase === "missed" || (phase === "unavailable" && reason === "failed");
}

/**
 * 대화 화면의 마이크 권한 안내 설정(ADR-0206) — 열 때 확인하지 않습니다(미리보기 시작 단추가 맡음). 대화 중 권한 거부면 거부 시트가 서고,
 * Continue without speaking은 시트만 닫아 턴마다 「Can't speak now」로 넘기게 둡니다(그 뒤 이 화면에서는 다시 띄우지 않음).
 */
export function roleplayTalkMic(context: MicPermissionContext | undefined): MicPermissionOptions {
  return { surface: "roleplay", context, checkOnOpen: false, onSkipSpeaking: () => {} };
}

/** 못 알아들은 까닭마다의 안내 — 말을 못 알아들음은 다시 말하기, 네트워크는 연결 확인 뒤 다시입니다. */
export function roleplayMissedMessage(reason: SpeechMissReason, copy: UiCopy): string {
  return reason === "network" ? copy.speaking.networkRetry : copy.roleplayStory.retryHeard;
}

export function RoleplaySpeakControls({
  phase,
  unavailableReason,
  missedReason,
  retrying,
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
        <text
          className="roleplay-story-hint"
          data-testid="roleplay-talk-unavailable"
          data-reason={unavailableReason ?? ""}
        >
          {unavailableMessage(unavailableReason, copy)}
        </text>
      ) : null}
      {phase === "missed" && missedReason !== null ? (
        <text
          className="roleplay-story-hint"
          data-testid="roleplay-talk-missed"
          data-reason={missedReason}
        >
          {roleplayMissedMessage(missedReason, copy)}
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
      {/* 못 알아들은 뒤의 Try again — 마이크와 같은 동작(같은 턴을 다시 듣기)을 이름 있는 버튼으로도 둡니다. */}
      {/* 누르면 듣는 중이 되어도 같은 자리가 Stop으로 남습니다 — 스크린리더 포커스가 사라져 마이크가 켜진 채 다른 요소를
        낭독하지 않게 합니다. */}
      {roleplayRetryable(phase, unavailableReason) || (listening && retrying) ? (
        <view className="roleplay-story-missed-retry" data-testid="roleplay-talk-missed-retry">
          <Button
            label={listening ? copy.roleplayStory.stop : copy.speaking.tryAgain}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={onMic}
          />
        </view>
      ) : null}
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
