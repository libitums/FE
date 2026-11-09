import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import image from "@libitums/icons/lynx/image";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import { color } from "@libitums/design-tokens";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";

import { ChatPhoto } from "../../components/chat/ChatMessageRow";
import { useUiCopy } from "../../lib/ui-copy";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { voiceDurationLabel } from "./chat-rules";
import { SLOP_SMALL } from "./hit-slop";
import type { ChatText } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./messenger-chat.css";

export type PhotoPendingBubbleProps = { readonly name: string; readonly testId: string };
export type PhotoBubbleProps = {
  readonly src: string | null;
  readonly name: string;
  readonly testId: string;
};
export type VoicePendingBubbleProps = { readonly name: string; readonly testId: string };
export type VoiceBubbleProps = {
  readonly durationMs: number;
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

// 사진 도착 — 3:4 사진. 그림을 못 풀었으면(src null) 같은 크기의 빈 면입니다.
export function PhotoBubble({ src, name, testId }: PhotoBubbleProps): ReactNode {
  const copy = useUiCopy().messengerChat.room;
  return (
    <view accessibility-element={true} accessibility-label={copy.photoLabel(name)}>
      {src === null ? (
        <view className="chat-photo-3x4 messenger-chat-photo-empty" data-testid={testId} />
      ) : (
        <ChatPhoto src={src} aspect="portrait-3x4" testId={testId} />
      )}
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

// 음성 도착 — 재생 버튼(가짜 재생: 누르면 길이만큼 playing 뒤 idle) · 파형 · 길이 · 한국어 · 영어.
// 말풍선 본문은 한 문장으로 읽히고 재생 버튼은 따로 버튼입니다(버튼은 본문 위 같은 자리에 얹힙니다).
export function VoiceBubble({ durationMs, text, name, testId }: VoiceBubbleProps): ReactNode {
  const copy = useUiCopy().messengerChat.room;
  const [playing, setPlaying] = useState(false);
  const duration = voiceDurationLabel(durationMs);

  useEffect(() => {
    if (!playing) return;
    const handle = setTimeout(() => setPlaying(false), durationMs);
    return () => clearTimeout(handle);
  }, [playing, durationMs]);

  return (
    <view className="messenger-chat-voice" data-testid={testId}>
      <view
        className="messenger-chat-voice-body"
        accessibility-element={true}
        accessibility-label={copy.voiceLabel(name, duration, text.ko, text.en)}
      >
        <view className="messenger-chat-voice-top">
          <view className="messenger-chat-voice-slot messenger-chat-voice-slot-clear" />
          <WaveBars />
          <text className="messenger-chat-voice-duration">{duration}</text>
        </view>
        <text className="messenger-chat-voice-ko">{text.ko}</text>
        <text className="messenger-chat-voice-en">{text.en}</text>
      </view>
      <view
        className="messenger-chat-voice-play"
        data-testid={ids.voicePlay}
        data-playback={playing ? "playing" : "idle"}
        hit-slop={SLOP_SMALL}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={playing ? copy.pause : copy.play}
        bindtap={() => {
          "background only";
          setPlaying((current) => !current);
        }}
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
