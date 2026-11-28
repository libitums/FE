import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { SpeechMic } from "../../components/speech-mic/SpeechMic";
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
  /** 내가 말할 문장의 뜻 — 패널 맨 위에 늘 섭니다(시안 R1). 없으면 `null`. */
  readonly meaning: string | null;
  /** 「Show Korean」을 고른 뒤의 한국어 · 로마자. 아니면 `null`. */
  readonly korean: { readonly ko: string; readonly roman: string } | null;
  /** 힌트 줄(Hear it · Show Korean)을 펼쳤는가. */
  readonly hintOpen: boolean;
  /** 내 문장 소리가 있으면 Hear it이 섭니다. */
  readonly canHear: boolean;
  readonly onMic: () => void;
  /** 듣는 중 최대 시간이 지나면. */
  readonly onExpire: () => void;
  readonly onHint: () => void;
  readonly onHear: () => void;
  readonly onShowKorean: () => void;
  readonly onSkip: () => void;
};

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

/**
 * 마이크의 낭독 이름과 아래 상태 문구 — 듣는 중 「Stop」, 못 알아들음 · 인식 실패 뒤 「Try again」, 그 밖 「Speak」(이름) · 없음(문구).
 * 마이크 하나가 다시 말하기를 맡습니다 — 같은 동작의 버튼을 따로 두지 않습니다(2026-11-27 사용자 지시, ADR-0206 D5 개정).
 */
export function roleplayMicLabels(
  phase: RoleplayTalkPhase,
  reason: SpeechUnavailableReason | null,
  copy: UiCopy,
): { readonly label: string; readonly status: string | null } {
  if (phase === "listening")
    return { label: copy.roleplayStory.stop, status: copy.speaking.listening };
  if (roleplayRetryable(phase, reason)) {
    return { label: copy.speaking.tryAgain, status: copy.speaking.tryAgain };
  }
  return { label: copy.roleplayStory.speak, status: null };
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

/**
 * 말하기 패널입니다(시안 R1 · R2 · R5) — 흰 카드 면 위에 내 문장(뜻, 고르면 한국어 · 로마자) → 공용 마이크 → 작은 Hint ·
 * Can't speak 단추. 그림 위에 흰 글자를 두지 않습니다(대비 4.5:1). 「Can't speak now」는 판정 없이 이 턴을 넘깁니다.
 */
export function RoleplaySpeakControls({
  phase,
  unavailableReason,
  missedReason,
  meaning,
  korean,
  hintOpen,
  canHear,
  onMic,
  onExpire,
  onHint,
  onHear,
  onShowKorean,
  onSkip,
}: RoleplaySpeakControlsProps): ReactNode {
  const copy = useUiCopy();
  const listening = phase === "listening";
  const retryable = roleplayRetryable(phase, unavailableReason);
  const mic = roleplayMicLabels(phase, unavailableReason, copy);
  const micState = listening
    ? "listening"
    : phase === "unavailable" && !retryable
      ? "disabled"
      : "idle";
  return (
    <view className="roleplay-story-speak roleplay-story-panel" data-testid="roleplay-talk-panel">
      <view className="roleplay-story-panel-line">
        <text className="roleplay-story-panel-label">{copy.roleplayStory.yourLine}</text>
        {korean === null ? null : (
          <view className="roleplay-story-panel-korean" data-testid="roleplay-talk-korean">
            <text className="roleplay-story-panel-ko">{korean.ko}</text>
            <text className="roleplay-story-panel-roman">{korean.roman}</text>
          </view>
        )}
        {meaning === null ? null : (
          <text className="roleplay-story-panel-meaning" data-testid="roleplay-talk-meaning">
            {meaning}
          </text>
        )}
      </view>
      {hintOpen && !listening ? (
        <view className="roleplay-story-hint-row" data-testid="roleplay-talk-hint">
          {canHear ? (
            <view className="roleplay-story-hint-button" data-testid="roleplay-talk-hear">
              <Button
                label={copy.roleplayStory.hearIt}
                variant="neutral"
                size="m"
                width="fill"
                bindtap={onHear}
              />
            </view>
          ) : null}
          {korean === null ? (
            <view className="roleplay-story-hint-button" data-testid="roleplay-talk-show-korean">
              <Button
                label={copy.roleplayStory.showKorean}
                variant="neutral"
                size="m"
                width="fill"
                bindtap={onShowKorean}
              />
            </view>
          ) : null}
        </view>
      ) : null}
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
      <view className="roleplay-story-panel-mic-row" data-testid="roleplay-talk-mic">
        <SpeechMic
          testId="roleplay-mic"
          state={micState}
          label={mic.label}
          status={mic.status}
          onTap={onMic}
          onExpire={onExpire}
        />
      </view>
      <view className="roleplay-story-links">
        {!hintOpen && !listening ? (
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
