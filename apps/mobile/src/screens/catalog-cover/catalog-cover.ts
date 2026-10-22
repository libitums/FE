// 카탈로그 표지 컷의 순수 표시 모델입니다 — 컷 → 표시 모델, 번역 · 토글 · 다음 · 낭독.

import { EPISODE_SELF_SPEAKER } from "@libitums/episode-core/lines";

import { audioSyncLengthMs } from "../../lib/audio-manifest";
import { contentAudioSourceOf } from "../../lib/content-audio";
import type { EpisodeCut, Text } from "../../lib/episode-content.model";
import type { FillScript } from "../../lib/placeholder-fill";
import type { AudioCue } from "../../lib/use-audio-cue";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  CatalogCutPort,
  CatalogCuts,
  CatalogCutScript,
  CatalogCutSpeaker,
  CatalogCutText,
  CatalogCutView,
} from "./catalog-cover.contract";

// 콘텐츠의 자기 화자 값 비교용입니다(앱은 이 화자를 `Me`로 그립니다). 값의 정본은 패키지입니다.
export const CATALOG_SELF_SPEAKER = EPISODE_SELF_SPEAKER;

function filled(
  value: string | undefined,
  script: FillScript,
  port: CatalogCutPort,
): string | null {
  if (value === undefined) return null;
  const text = port.fill(value, script);
  return text.trim() === "" ? null : text;
}

// 영어 줄은 `"en"` 스크립트로 채웁니다 - 나라는 영어 이름으로 서고, 기본값은 로마자와 같습니다.
function textOf(text: Text, port: CatalogCutPort): CatalogCutText | null {
  const ko = filled(text.ko, "ko", port);
  if (ko === null) return null;
  return {
    ko,
    en: filled(text.en, "en", port),
    roman: filled(text.roman, "roman", port),
  };
}

// 독백은 괄호 안에 둡니다(사용자 결정 2026-10-12). 치환 뒤 문장 전체를 감쌉니다.
function inParentheses(text: CatalogCutText): CatalogCutText {
  const wrap = (value: string | null) => (value === null ? null : `(${value})`);
  return { ko: `(${text.ko})`, en: wrap(text.en), roman: wrap(text.roman) };
}

function speakerOf(speaker: string): CatalogCutSpeaker | null {
  const name = speaker.trim();
  if (name === "") return null;
  return name === CATALOG_SELF_SPEAKER ? { kind: "self" } : { kind: "named", name };
}

// 소리는 치환 전 원문 ko로 판정합니다 - 프로필이 채워져 중괄호가 사라져도 자리표시자 줄은 소리가 없습니다.
// 맞출 길이는 소리가 나는 컷에만 싣습니다 - 음성 정보 파일에 항목이 없으면 타자기는 기본 간격입니다.
function audioOf(
  cut: EpisodeCut,
  rawKo: string,
  port: CatalogCutPort,
): { audioSource?: string; voiceSyncMs?: number } {
  const source = contentAudioSourceOf(cut.audioUrl, rawKo, port.imageUrlOf);
  if (source === null || cut.audioUrl === undefined) return {};
  const length = audioSyncLengthMs(port.audioTimingOf(cut.audioUrl));
  return length === null ? { audioSource: source } : { audioSource: source, voiceSyncMs: length };
}

function viewOf(cut: EpisodeCut, port: CatalogCutPort): CatalogCutView | null {
  const imageUrl = cut.imageUrl === undefined ? null : port.imageUrlOf(cut.imageUrl);
  if (cut.kind === "narration") {
    const text = textOf(cut.narration, port);
    if (text === null) return null;
    const audio = audioOf(cut, cut.narration.ko, port);
    return { kind: "narration", index: cut.index, text, imageUrl, ...audio };
  }
  const text = textOf(cut.line, port);
  if (text === null) return null;
  const speaker = speakerOf(cut.speaker);
  const audio = audioOf(cut, cut.line.ko, port);
  // 패널이 빈 화자에 던지므로 화자 없는 대사는 내레이션으로 그립니다.
  if (speaker === null) return { kind: "narration", index: cut.index, text, imageUrl, ...audio };
  if (cut.kind === "monologue") {
    const thought = inParentheses(text);
    return {
      kind: "line",
      voice: "thought",
      index: cut.index,
      speaker,
      text: thought,
      aside: null,
      imageUrl,
      ...audio,
    };
  }
  const aside = textOf(cut.aside, port);
  return {
    kind: "line",
    voice: "speech",
    index: cut.index,
    speaker,
    text,
    aside,
    imageUrl,
    ...audio,
  };
}

export function catalogCutViewsOf(
  cuts: readonly EpisodeCut[],
  port: CatalogCutPort,
): readonly CatalogCutView[] {
  const views: CatalogCutView[] = [];
  for (const cut of cuts) {
    const view = viewOf(cut, port);
    if (view !== null) views.push(view);
  }
  return views;
}

/** 컷이 설 때 나야 할 소리입니다. 소리가 없으면 `null`입니다. */
export function catalogCutAudioCueOf(cut: CatalogCutView, index: number): AudioCue | null {
  return cut.audioSource === undefined ? null : { key: String(index), source: cut.audioSource };
}

export function catalogCutsOf(views: readonly CatalogCutView[]): CatalogCuts | null {
  const [first, ...rest] = views;
  return first === undefined ? null : [first, ...rest];
}

export function catalogCutTranslation(
  text: CatalogCutText,
  script: CatalogCutScript,
): string | null {
  return script === "en" ? (text.en ?? text.roman) : (text.roman ?? text.en);
}

export function catalogCutHasToggle(text: CatalogCutText): boolean {
  return text.en !== null && text.roman !== null;
}

export function nextCatalogCutScript(script: CatalogCutScript): CatalogCutScript {
  return script === "en" ? "roman" : "en";
}

export function nextCatalogCutIndex(index: number, total: number): number | null {
  return index + 1 < total ? index + 1 : null;
}

export function catalogCutSpeakerName(speaker: CatalogCutSpeaker, copy: UiCopy): string {
  return speaker.kind === "self" ? copy.common.me : speaker.name;
}

function unwrap(value: string): string {
  return value.startsWith("(") && value.endsWith(")") ? value.slice(1, -1) : value;
}

function withoutParentheses(text: CatalogCutText): CatalogCutText {
  return {
    ko: unwrap(text.ko),
    en: text.en === null ? null : unwrap(text.en),
    roman: text.roman === null ? null : unwrap(text.roman),
  };
}

export function catalogCutAccessibilityLabel(
  view: CatalogCutView,
  script: CatalogCutScript,
  copy: UiCopy,
): string {
  // 지문은 화자 뒤에 둡니다 — 보조기술 사용자가 장면 지시를 놓치지 않게(시각 패널과 같은 순서).
  const thought = view.kind === "line" && view.voice === "thought";
  // 독백은 괄호 대신 「thinking」으로 알립니다 — 보조기술이 괄호를 기호로 읽지 않게.
  const spoken = thought ? withoutParentheses(view.text) : view.text;
  const lead =
    view.kind === "line"
      ? `${catalogCutSpeakerName(view.speaker, copy)}${thought ? `, ${copy.catalogCover.thinking}` : ""}${view.aside === null ? "" : `, ${view.aside.ko}`}: `
      : "";
  let label = `${lead}${spoken.ko}`;
  const translation = catalogCutTranslation(spoken, script);
  if (translation !== null) label += ` ${translation}`;
  if (catalogCutHasToggle(view.text)) label += `, ${copy.catalogCover.toggleScript[script]}`;
  return label;
}
