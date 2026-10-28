import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import mic from "@libitums/icons/lynx/mic";
import phone from "@libitums/icons/lynx/phone";
import volume from "@libitums/icons/lynx/volume";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useAudioCue } from "../../lib/use-audio-cue";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { STORY_CALL_CONNECT_MS, formatCallClock } from "./story-call";
import {
  storyCallTestIds as ids,
  type StoryCallLineView,
  type StoryCallScreenProps,
} from "./story-call.contract";

import "./story-call.css";

type Phase = "incoming" | "active" | "ended";

function CallLine({ line, me }: { line: StoryCallLineView; me: string }): ReactNode {
  return (
    <view
      className={`story-call-line story-call-line-${line.kind}`}
      data-testid={ids.line}
      data-kind={line.kind}
    >
      <text className="story-call-line-label" data-testid={ids.lineLabel}>
        {line.kind === "self" ? me : line.label}
      </text>
      <text className="story-call-line-text" data-testid={ids.lineText}>
        {line.text.ko}
      </text>
      {line.text.en === "" ? null : <text className="story-call-line-en">{line.text.en}</text>}
    </view>
  );
}

// 전화 막간 화면입니다(ADR-0088 D6). 수신(이니셜 · 물결 · Answer) → 통화(이름 · 시계 · 가운데 대사 한 줄이 시간에 따라
// 바뀜) → 끊김(시간 · `call_end` 지문 · Finish story). 짙은 면이 띠까지 덮으므로 밝은 아이콘 표지를 답니다.
// 음소거 · 스피커 · 끊기는 전화다운 틀일 뿐 누르지 않습니다.
export function StoryCallScreen({
  insets,
  call,
  onComplete,
  onExit,
}: StoryCallScreenProps): ReactNode {
  const copy = useUiCopy().storyCall;
  const [phase, setPhase] = useState<Phase>("incoming");
  const [shown, setShown] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const completed = useRef(false);
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const current = call.lines[shown - 1];

  // 지금 줄의 소리 — 줄이 바뀌면 다시 틀고, 끊기거나 나가면 멈춥니다.
  useAudioCue(
    phase === "active" && current?.audioSource != null
      ? { key: String(shown), source: current.audioSource }
      : null,
  );

  // 다음 대사(또는 끊김)까지 타이머 하나만 겁니다 — 지금 줄의 소리가 다 들리거나 글을 읽을 시간만큼 기다립니다.
  useEffect(() => {
    if (phase !== "active") return undefined;
    const ms = current === undefined ? STORY_CALL_CONNECT_MS : current.holdMs;
    const done = shown >= call.lines.length;
    const timer = setTimeout(() => {
      if (done) setPhase("ended");
      else setShown((n) => n + 1);
    }, ms);
    return () => clearTimeout(timer);
    // 지금 줄(`current`)과 줄 수는 `shown` · 모델에서 나옵니다 — 단계가 바뀔 때만 다시 겁니다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, shown]);
  useEffect(() => {
    if (phase !== "active") return undefined;
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [phase]);

  const handleExit = () => {
    "background only";
    onExit();
  };
  useScreenBack(handleExit);

  // 프로필 그림은 Avatar 최대(96)보다 크게 그립니다 — 수신 136 · 통화 104. 그림이 없으면 이니셜 Avatar(xl)입니다.
  const avatar = (size: "hero" | "large") => (
    <view className={`story-call-avatar story-call-avatar-${size}`}>
      {(phase === "incoming" || (phase === "active" && current?.kind === "caller")) &&
      !reducedMotion ? (
        <view className="story-call-ring" />
      ) : null}
      {call.counterpartAvatarUrl === null ? (
        <Avatar name={call.counterpart} size="xl" accessibility="hidden" />
      ) : (
        <image
          className={`story-call-photo story-call-photo-${size}`}
          data-testid={ids.photo}
          src={call.counterpartAvatarUrl}
          mode="aspectFill"
        />
      )}
    </view>
  );

  return (
    <view className="story-call" data-testid={ids.screen} data-statusbar={lightStatusBarIcons}>
      {call.backgroundUrl === null ? null : (
        <image className="story-call-image" src={call.backgroundUrl} mode="aspectFill" />
      )}
      <view className={`story-call-shade${phase === "active" ? " story-call-shade-deep" : ""}`} />
      <view
        className="story-call-safe"
        style={{ paddingTop: `${insets.top}px`, paddingBottom: `${insets.bottom + 24}px` }}
      >
        <view className="story-call-header" data-testid={ids.back}>
          <RoundButton
            accessibilityLabel={copy.back}
            icon={arrowLeft03}
            variant="neutral"
            size="xl"
            bindtap={handleExit}
          />
        </view>

        {phase === "incoming" ? (
          <view className="story-call-body" data-testid={ids.incoming}>
            <text className="story-call-caption">{copy.incoming}</text>
            {avatar("hero")}
            <text className="story-call-name-l">{call.counterpart}</text>
            <view className="story-call-spacer" />
            <view
              className="story-call-answer"
              data-testid={ids.answer}
              accessibility-element={true}
              accessibility-label={copy.answer}
              accessibility-traits="button"
              bindtap={() => {
                "background only";
                setPhase("active");
              }}
            >
              <svg className="story-call-answer-icon" content={phone} current-color={color.white} />
            </view>
            <text className="story-call-answer-label">{copy.answer}</text>
          </view>
        ) : null}

        {phase === "active" ? (
          <view className="story-call-body" data-testid={ids.active}>
            {avatar("large")}
            <text className="story-call-name">{call.counterpart}</text>
            <text className="story-call-clock" data-testid={ids.clock}>
              {formatCallClock(seconds)}
            </text>
            <view className="story-call-stage">
              {current === undefined ? (
                <text className="story-call-connecting">{copy.connecting}</text>
              ) : (
                <CallLine line={current} me={copy.me} />
              )}
            </view>
            <view className="story-call-controls" accessibility-elements-hidden={true}>
              {[
                { id: "mute", label: copy.mute, icon: mic, end: false },
                { id: "speaker", label: copy.speaker, icon: volume, end: false },
                { id: "end", label: copy.end, icon: phone, end: true },
              ].map(({ id, label, icon, end }) => (
                <view key={id} className="story-call-control">
                  <view
                    className={`story-call-control-surface${end ? " story-call-control-end" : ""}`}
                  >
                    <svg
                      className={`story-call-control-icon${end ? " story-call-control-icon-end" : ""}`}
                      content={icon}
                      current-color={color.white}
                    />
                  </view>
                  <text className="story-call-control-label">{label}</text>
                </view>
              ))}
            </view>
          </view>
        ) : null}

        {phase === "ended" ? (
          <view className="story-call-body" data-testid={ids.ended}>
            {avatar("large")}
            <text className="story-call-name">{call.counterpart}</text>
            <text className="story-call-ended">{copy.callEnded(formatCallClock(seconds))}</text>
            <view className="story-call-stage">
              {call.end === null ? null : (
                <view className="story-call-line">
                  <text className="story-call-end-text" data-testid={ids.endText}>
                    {call.end.ko}
                  </text>
                  {call.end.en === "" ? null : (
                    <text className="story-call-line-en">{call.end.en}</text>
                  )}
                </view>
              )}
            </view>
            <view className="story-call-finish" data-testid={ids.finish}>
              <Button
                label={copy.finish}
                variant="brand"
                size="xl"
                width="fill"
                bindtap={() => {
                  "background only";
                  if (completed.current) return;
                  // oxlint-disable-next-line react/immutability -- 완료를 한 번만 올리는 표식입니다(렌더와 무관).
                  completed.current = true;
                  onComplete();
                }}
              />
            </view>
          </view>
        ) : null}
      </view>
    </view>
  );
}
