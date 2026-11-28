import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowUp from "@libitums/icons/lynx/arrow-up";
import mic from "@libitums/icons/lynx/mic";
import stop from "@libitums/icons/lynx/stop";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
import { phoneKeyboardHeightOf } from "../messenger-chat/keyboard-height";
import type { MissionMicMode } from "./mission-mic";
import { missionTestIds as ids } from "./mission-test-ids";

import "./roleplay-mission-talk.css";
import "./roleplay-mission-voice.css";

export type MissionComposerProps = {
  /** 보낼 수 있는가 — 내 차례이고 남은 턴이 있을 때. 아니면 입력 · 마이크 · 보내기가 잠깁니다. */
  readonly enabled: boolean;
  /** 마이크 하나의 낭독 이름 — Speak · Stop(녹음 중) · Try again(다시 말할 수 있는 실패 · 받아 적은 글 확인 뒤). */
  readonly micMode: MissionMicMode;
  /** 받아 적는 중 — 마이크가 잠깁니다. */
  readonly transcribing: boolean;
  /** 녹음 장치가 없으면(진짜 불가) 거짓 — 마이크가 꺼집니다. */
  readonly micUsable: boolean;
  readonly hintsLeft: number;
  readonly canHint: boolean;
  /** 입력 줄 위 오른쪽 안내(녹음 중 · 받아 적는 중 · 받아 적기 실패). 없으면 `null`. */
  readonly note: string | null;
  /** 받아 적은 글을 입력 칸에 넣고 확인을 부탁할 때 안내 자리에 대신 서는 글. 다시 말하기는 마이크가 맡습니다(「Try again」). */
  readonly check: string | null;
  /** 「Mission success!」 카드를 닫은 뒤 힌트 옆에 서는 끝내기 글 단추. 없으면 `null`. */
  readonly onFinish: (() => void) | null;
  /** 바뀌면 입력 칸을 이 글로 채웁니다(힌트 「Use this」). */
  readonly prefill: { readonly text: string; readonly key: number };
  readonly bottomInset: number;
  readonly onSend: (text: string) => void;
  readonly onMic: () => void;
  readonly onHint: () => void;
};

function ToolLink({
  testId,
  label,
  enabled,
  onTap,
}: {
  readonly testId: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly onTap: () => void;
}): ReactNode {
  return (
    <text
      className={`mission-composer-link${enabled ? "" : " mission-composer-link-disabled"}`}
      data-testid={testId}
      data-enabled={enabled ? "true" : "false"}
      accessibility-traits={enabled ? "button" : "disabled"}
      bindtap={enabled ? onTap : undefined}
    >
      {label}
    </text>
  );
}

type NativeInputEvent = { readonly detail: { readonly value: string } };
type KeyboardEvent = { readonly detail: { readonly height?: unknown } };

/**
 * 미션의 입력 줄입니다(PRD §7 — 새로 만듦). 메신저 입력 줄은 방 상태(학습 자판 · 보기 · 엽전 보내기)에 묶여 있어
 * 가져오지 않고, 같은 값의 면(알약 칸 · 둥근 보내기)으로 휴대폰 키보드 한 가지만 둡니다. 위 줄에 힌트 단추와 안내,
 * 아래 줄에 마이크 · 글 칸 · 보내기가 섭니다. 마이크는 대본형 롤플레이의 공용 마이크와 같은 말(주색 면 · 흰 마이크 → 녹음 중 멈춤
 * 아이콘 · 옅은 주색 고리)이고 단추 하나가 말하기 · 멈추기 · 다시 말하기를 맡습니다(ADR-0206 D5 개정). 받아 적은 글은 화면이
 * 바로 보내거나 이 칸에 넣습니다.
 */
export function MissionComposer({
  enabled,
  micMode,
  transcribing,
  micUsable,
  hintsLeft,
  canHint,
  note,
  check,
  onFinish,
  prefill,
  bottomInset,
  onSend,
  onMic,
  onHint,
}: MissionComposerProps): ReactNode {
  const copy = useMissionCopy();
  const ui = useUiCopy();
  const [text, setText] = useState("");
  // 밖에서 글을 넣으면(힌트) 입력을 default-value로 다시 마운트합니다(메신저 입력 칸과 같은 방법).
  const [epoch, setEpoch] = useState(0);
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    if (prefill.key === 0) return;
    setText(prefill.text);
    setEpoch((value) => value + 1);
  }, [prefill.key]);

  const canSend = enabled && text.trim() !== "";
  const send = () => {
    "background only";
    if (!canSend) return;
    onSend(text);
    setText("");
    setEpoch((value) => value + 1);
  };
  const recording = micMode === "stop";
  const micEnabled = recording || (enabled && !transcribing && micUsable);
  const micLabel =
    micMode === "stop"
      ? ui.roleplayStory.stop
      : micMode === "tryAgain"
        ? ui.speaking.tryAgain
        : ui.roleplayStory.speak;

  return (
    <view
      className="mission-composer"
      data-testid={ids.composer}
      style={{ paddingBottom: `${String(Math.max(bottomInset, keyboard))}px` }}
    >
      <view className="mission-composer-tools">
        <view className="mission-composer-links">
          <ToolLink
            testId={ids.hintButton}
            label={copy.hint(hintsLeft)}
            enabled={canHint}
            onTap={onHint}
          />
          {onFinish === null ? null : (
            <ToolLink
              testId={ids.finishButton}
              label={copy.extra.success.finish}
              enabled={enabled}
              onTap={onFinish}
            />
          )}
        </view>
        {check !== null ? (
          <text className="mission-composer-note" data-testid={ids.heardCheck}>
            {check}
          </text>
        ) : note === null ? null : (
          <text className="mission-composer-note" data-testid={ids.composerNote}>
            {note}
          </text>
        )}
      </view>
      <view className="mission-composer-row">
        <view
          className={`mission-composer-round mission-composer-mic${recording ? " mission-composer-mic-listening" : ""}${micEnabled ? "" : " mission-composer-round-disabled"}`}
          data-testid={ids.mic}
          data-listening={recording ? "true" : "false"}
          data-transcribing={transcribing ? "true" : "false"}
          data-mode={micMode}
          accessibility-element={true}
          accessibility-traits={micEnabled ? "button" : "disabled"}
          accessibility-label={micLabel}
          bindtap={micEnabled ? onMic : undefined}
        >
          <svg
            className="mission-composer-icon"
            content={recording ? stop : mic}
            current-color={color.white}
          />
        </view>
        <view className="mission-composer-pill">
          <input
            key={epoch}
            className="mission-composer-input"
            data-testid={ids.input}
            default-value={text}
            placeholder={copy.placeholder}
            confirm-type="send"
            accessibility-label={copy.placeholder}
            user-interaction-enabled={enabled}
            bindinput={(event: NativeInputEvent) => {
              "background only";
              setText(event.detail.value);
            }}
            bindconfirm={send}
            {...{
              bindkeyboardheightchange: (event: KeyboardEvent) => {
                "background only";
                const info = typeof SystemInfo === "undefined" ? undefined : SystemInfo;
                setKeyboard(phoneKeyboardHeightOf(event.detail.height, info));
              },
            }}
          />
        </view>
        <view
          className={`mission-composer-round${canSend ? "" : " mission-composer-round-disabled"}`}
          data-testid={ids.send}
          data-enabled={canSend ? "true" : "false"}
          accessibility-element={true}
          accessibility-traits={canSend ? "button" : "disabled"}
          accessibility-label={copy.send}
          bindtap={canSend ? send : undefined}
        >
          <svg className="mission-composer-icon" content={arrowUp} current-color={color.white} />
        </view>
      </view>
    </view>
  );
}
