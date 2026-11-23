import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowUp from "@libitums/icons/lynx/arrow-up";
import mic from "@libitums/icons/lynx/mic";
import stop from "@libitums/icons/lynx/stop";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { phoneKeyboardHeightOf } from "../messenger-chat/keyboard-height";
import { missionTestIds as ids } from "./mission-test-ids";

import "./roleplay-mission-talk.css";
import "./roleplay-mission-voice.css";

export type MissionComposerProps = {
  /** 보낼 수 있는가 — 내 차례이고 남은 턴이 있을 때. 아니면 입력 · 마이크 · 보내기가 잠깁니다. */
  readonly enabled: boolean;
  /** 녹음 중 — 마이크가 멈춤 단추가 됩니다. */
  readonly recording: boolean;
  /** 받아 적는 중 — 마이크가 잠깁니다. */
  readonly transcribing: boolean;
  readonly hintsLeft: number;
  readonly canHint: boolean;
  /** 입력 줄 위 오른쪽 안내(녹음 중 · 받아 적는 중 · 받아 적기 실패). 없으면 `null`. */
  readonly note: string | null;
  /** 받아 적은 글을 입력 칸에 넣고 확인을 부탁할 때 — 안내 자리에 대신 서는 글과 「다시 말하기」. */
  readonly check: { readonly text: string; readonly again: string } | null;
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
 * 아래 줄에 마이크 · 글 칸 · 보내기가 섭니다. 마이크는 눌러 시작 · 눌러 끝이고, 받아 적은 글은 화면이 바로 보내거나 이 칸에 넣습니다.
 */
export function MissionComposer({
  enabled,
  recording,
  transcribing,
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
  const copy = useUiCopy().roleplayMission;
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
  const micEnabled = (enabled && !transcribing) || recording;

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
          <view className="mission-composer-check" data-testid={ids.heardCheck}>
            <text className="mission-composer-note">{check.text}</text>
            <ToolLink
              testId={ids.sayAgain}
              label={check.again}
              enabled={micEnabled}
              onTap={onMic}
            />
          </view>
        ) : note === null ? null : (
          <text className="mission-composer-note" data-testid={ids.composerNote}>
            {note}
          </text>
        )}
      </view>
      <view className="mission-composer-row">
        <view
          className={`mission-composer-round${recording ? "" : " mission-composer-round-quiet"}${micEnabled ? "" : " mission-composer-round-disabled"}`}
          data-testid={ids.mic}
          data-listening={recording ? "true" : "false"}
          data-transcribing={transcribing ? "true" : "false"}
          accessibility-element={true}
          accessibility-traits={micEnabled ? "button" : "disabled"}
          accessibility-label={recording ? copy.stop : copy.speak}
          bindtap={micEnabled ? onMic : undefined}
        >
          <svg
            className="mission-composer-icon"
            content={recording ? stop : mic}
            current-color={recording ? color.white : color.fg["neutral-muted"]}
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
