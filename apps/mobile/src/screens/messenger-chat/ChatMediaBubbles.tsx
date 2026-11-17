import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import image from "@libitums/icons/lynx/image";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import { color } from "@libitums/design-tokens";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { ChatPhoto } from "../../components/chat/ChatMessageRow";
import { playAudio, stopAudio } from "../../lib/audio";
import { SLOW_PLAYBACK_RATE } from "../../lib/listen-pace";
import { useUiCopy } from "../../lib/ui-copy";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { voiceDurationLabel } from "./chat-rules";
import { SLOP_SMALL } from "./hit-slop";
import type { ChatText } from "./chat-source.contract";
import { chatMediaTestIds as mediaIds } from "./chat-media.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./messenger-chat.css";
import "./chat-media.css";

export type PhotoPendingBubbleProps = { readonly name: string; readonly testId: string };
export type PhotoBubbleProps = {
  readonly src: string | null;
  /** 서버 사진의 비율 · AI 표시(ADR-0146 「앱 연결」) — 없으면 3:4 · 표시 없음. */
  readonly aspect?: "3:2" | "1:1";
  readonly aiGenerated?: boolean;
  readonly name: string;
  readonly testId: string;
  /** 누르면 사진 보기를 엽니다(ADR-0150 2026-11-17 추가). 그림이 없으면(src null) 누를 수 없습니다. */
  readonly onOpen?: () => void;
};
export type VoicePendingBubbleProps = { readonly name: string; readonly testId: string };
export type VoiceBubbleProps = {
  /** 0이면 모름 — 길이 글자를 그리지 않습니다. */
  readonly durationMs: number;
  /** 서버 음성의 서명 URL(null = 못 받음, 재생 꺼짐). 없으면 가짜 재생입니다. */
  readonly audioUrl?: string | null;
  readonly text: ChatText;
  readonly name: string;
  readonly testId: string;
};

function WaveBars(): ReactNode {
  return (
    <view className="messenger-chat-wave" accessibility-elements-hidden={true}>
      {CHAT_PLACEHOLDERS.waveform.map((barHeight, index) => (
        <view
          key={index}
          className="messenger-chat-wave-bar"
          style={{ height: `${barHeight}px` }}
        />
      ))}
    </view>
  );
}

// 사진 pending — 도착할 3:4 사진과 같은 180 × 240 상자. 묶음 전체가 상태 한 줄로 읽히고, 반짝임은 움직임 줄이기에서 멈춥니다.
export function PhotoPendingBubble({ name, testId }: PhotoPendingBubbleProps): ReactNode {
  const copy = useUiCopy().messengerChat.room;
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const label = copy.sendingPhoto(name);
  return (
    <view
      className={`messenger-chat-photo-pending${reducedMotion ? " messenger-chat-skeleton-still" : ""}`}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
    >
      <view className="messenger-chat-photo-skeleton">
        <view className="messenger-chat-photo-disc">
          <svg
            className="messenger-chat-icon-sm"
            content={image}
            current-color={color.fg["neutral-subtle"]}
          />
        </view>
        <view className="messenger-chat-skeleton-lines">
          <view className="messenger-chat-skeleton-line messenger-chat-skeleton-line-long" />
          <view className="messenger-chat-skeleton-line messenger-chat-skeleton-line-short" />
        </view>
        <view className="messenger-chat-shimmer" />
      </view>
      <text className="messenger-chat-status" accessibility-element={false}>
        {label}
      </text>
    </view>
  );
}

const ASPECT_CLASS = {
  "3:2": "messenger-chat-photo-3x2",
  "1:1": "messenger-chat-photo-1x1",
} as const;

// 사진 도착 — 가짜는 3:4, 서버 사진은 3:2 · 1:1 + 「AI-generated」(ADR-0146 「앱 연결」). 그림을 못 풀었으면(src null) 같은 크기의 빈 면입니다.
// `onOpen`이 있고 그림이 있으면 묶음 전체가 단추입니다 — 누르면 사진 보기(앨범과 같은 화면)를 엽니다.
export function PhotoBubble({
  src,
  aspect,
  aiGenerated,
  name,
  testId,
  onOpen,
}: PhotoBubbleProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const label = chat.room.photoLabel(name);
  const box = aspect === undefined ? "chat-photo-3x4" : ASPECT_CLASS[aspect];
  const open = src === null ? undefined : onOpen;
  return (
    <view
      accessibility-element={true}
      accessibility-label={aiGenerated === true ? `${label}, ${chat.media.aiLabel}` : label}
      {...(open === undefined
        ? {}
        : {
            "data-testid": ids.photoOpen,
            "accessibility-traits": "button",
            "accessibility-enable-tap": true,
            bindtap: () => {
              "background only";
              open();
            },
          })}
    >
      {src === null ? (
        <view className={`${box} messenger-chat-photo-empty`} data-testid={testId} />
      ) : aspect === undefined ? (
        <ChatPhoto src={src} aspect="portrait-3x4" testId={testId} />
      ) : (
        <image
          className={box}
          data-testid={testId}
          data-aspect={aspect}
          src={src}
          mode="aspectFill"
        />
      )}
      {aiGenerated === true ? (
        <text className="messenger-chat-media-ai" data-testid={mediaIds.ai}>
          {chat.media.aiLabel}
        </text>
      ) : null}
    </view>
  );
}

// 음성 pending — 재생 자리 원 · 회색 파형 · 아래 상태 한 줄. 도착과 같은 폭 220입니다.
export function VoicePendingBubble({ name, testId }: VoicePendingBubbleProps): ReactNode {
  const copy = useUiCopy().messengerChat.room;
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const label = copy.recordingVoice(name);
  return (
    <view
      className={`messenger-chat-voice-pending${reducedMotion ? " messenger-chat-skeleton-still" : ""}`}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
    >
      <view className="messenger-chat-voice-top">
        <view className="messenger-chat-voice-slot" />
        <WaveBars />
      </view>
      <text className="messenger-chat-status" accessibility-element={false}>
        {label}
      </text>
      <view className="messenger-chat-shimmer" />
    </view>
  );
}

// 음성 도착 — 재생 버튼 · 파형 · 길이 · 한국어 · 영어. 말풍선 본문은 한 문장으로 읽히고 재생 버튼은 따로 버튼입니다.
// 가짜(audioUrl 없음)는 누르면 길이만큼 playing 뒤 idle. 서버 음성은 호스트 재생(0.85배 — 명세 §4), 끝나면 idle, 다시 누르면 멈춤,
// 말풍선이 사라지면 멈춤. 길이를 모르면(0) 길이 글자가 없습니다(ADR-0146 「앱 연결」).
export function VoiceBubble({
  durationMs,
  audioUrl,
  text,
  name,
  testId,
}: VoiceBubbleProps): ReactNode {
  const chat = useUiCopy().messengerChat;
  const copy = chat.room;
  const [playing, setPlaying] = useState(false);
  const timed = durationMs > 0;
  const duration = voiceDurationLabel(durationMs);
  const real = audioUrl !== undefined;
  const silent = audioUrl === null;

  useEffect(() => {
    if (!playing || real) return;
    const handle = setTimeout(() => setPlaying(false), durationMs);
    return () => clearTimeout(handle);
  }, [playing, durationMs, real]);
  useEffect(() => {
    if (!playing || !real) return;
    return () => stopAudio();
  }, [playing, real]);
  const toggle = () => {
    "background only";
    if (!real) return setPlaying((current) => !current);
    if (playing) {
      stopAudio();
      return setPlaying(false);
    }
    if (audioUrl === null) return;
    const started = playAudio(audioUrl, () => setPlaying(false), SLOW_PLAYBACK_RATE);
    setPlaying(started === "started");
  };

  return (
    <view className="messenger-chat-voice" data-testid={testId}>
      <view
        className="messenger-chat-voice-body"
        accessibility-element={true}
        accessibility-label={
          timed
            ? copy.voiceLabel(name, duration, text.ko, text.en)
            : chat.media.voiceLabel(name, text.ko, text.en)
        }
      >
        <view className="messenger-chat-voice-top">
          <view className="messenger-chat-voice-slot messenger-chat-voice-slot-clear" />
          <WaveBars />
          {timed ? <text className="messenger-chat-voice-duration">{duration}</text> : null}
        </view>
        <text className="messenger-chat-voice-ko">{text.ko}</text>
        <text className="messenger-chat-voice-en">{text.en}</text>
      </view>
      <view
        className={`messenger-chat-voice-play${silent ? " messenger-chat-voice-play-off" : ""}`}
        data-testid={ids.voicePlay}
        data-playback={playing ? "playing" : "idle"}
        hit-slop={SLOP_SMALL}
        accessibility-element={true}
        accessibility-traits={silent ? "disabled" : "button"}
        accessibility-label={playing ? copy.pause : copy.play}
        catchtap={toggle}
      >
        <svg
          className="messenger-chat-icon-xs"
          content={playing ? pause : play}
          current-color={color.white}
        />
      </view>
    </view>
  );
}
