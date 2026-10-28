// 전화 막간의 순수 함수입니다(ADR-0088 D6) — 표시 모델 · 대사 시간 · 통화 시계.

import type { AudioTiming } from "../../lib/audio-manifest";
import { audioSyncLengthMs } from "../../lib/audio-manifest";
import { contentAudioSourceOf } from "../../lib/content-audio";
import type { EpisodeCall, EpisodeCallLine, Text } from "../../lib/episode-content.model";
import type { FillScript } from "../../lib/placeholder-fill";
import type { StoryCallLineView, StoryCallText, StoryCallView } from "./story-call.contract";

/** 전화를 받은 뒤 첫 대사까지 「Connecting…」이 머무는 시간입니다. */
export const STORY_CALL_CONNECT_MS = 1200;

/** 소리가 끝난 뒤 다음 줄까지의 틈 · 소리 줄의 가장 짧은 시간입니다. */
const AFTER_VOICE_MS = 900;
const MIN_VOICED_MS = 2400;
/** 소리가 없을 때 — 한국어와 번역을 둘 다 읽을 시간입니다. */
const READ_BASE_MS = 1600;
const READ_KO_MS_PER_CHAR = 90;
const READ_EN_MS_PER_CHAR = 30;
const READ_MIN_MS = 2800;
const READ_MAX_MS = 7000;

export type StoryCallPort = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly fill: (text: string, script: FillScript) => string;
  readonly audioTimingOf: (audioId: string) => AudioTiming | null;
};

function textOf(text: Text, port: StoryCallPort): StoryCallText {
  return {
    ko: port.fill(text.ko, "ko"),
    en: text.en === undefined ? "" : port.fill(text.en, "en"),
  };
}

// 소리는 치환 전 원문 ko로 판정합니다(컷 화면과 같음) — 자리표시자 줄은 소리가 없습니다.
function lineViewOf(line: EpisodeCallLine, port: StoryCallPort): StoryCallLineView {
  const text = textOf(line.line, port);
  const audioSource = contentAudioSourceOf(line.audioUrl, line.line.ko, port.imageUrlOf);
  const voiceMs =
    audioSource === null || line.audioUrl === undefined
      ? null
      : audioSyncLengthMs(port.audioTimingOf(line.audioUrl));
  return {
    kind: line.kind,
    label: line.label,
    text,
    audioSource,
    holdMs: storyCallHoldMs({ koChars: text.ko.length, enChars: text.en.length, voiceMs }),
  };
}

/** 도메인 통화 → 표시 모델. 그림 주소는 해석하고 글은 채웁니다. */
export function storyCallViewOf(call: EpisodeCall, port: StoryCallPort): StoryCallView {
  const [first, ...rest] = call.lines.map((line) => lineViewOf(line, port));
  return {
    counterpart: call.counterpart,
    counterpartAvatarUrl:
      call.counterpartImageUrl === undefined ? null : port.imageUrlOf(call.counterpartImageUrl),
    backgroundUrl: call.backgroundUrl === undefined ? null : port.imageUrlOf(call.backgroundUrl),
    lines: [first as StoryCallLineView, ...rest],
    end: call.end === undefined ? null : textOf(call.end, port),
  };
}

/**
 * 대사 한 줄이 가운데 머무는 시간 — 소리 길이(`speech_end_ms`)를 알면 말이 다 들린 뒤 틈만큼 더 두고,
 * 모르면(녹음 전 · 음성 정보 없음) 한국어 · 번역 글 길이로 넉넉히 잡습니다.
 */
export function storyCallHoldMs(input: {
  readonly koChars: number;
  readonly enChars: number;
  readonly voiceMs: number | null;
}): number {
  if (input.voiceMs !== null) return Math.max(MIN_VOICED_MS, input.voiceMs + AFTER_VOICE_MS);
  const read =
    READ_BASE_MS + READ_KO_MS_PER_CHAR * input.koChars + READ_EN_MS_PER_CHAR * input.enChars;
  return Math.min(READ_MAX_MS, Math.max(READ_MIN_MS, read));
}

/** 통화 시계 `mm:ss`. */
export function formatCallClock(seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}
