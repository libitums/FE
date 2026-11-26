// 보기 · 조각(칩)마다 그 낱말의 소리를 이 에피소드 녹음에서 찾습니다(순수, ADR-0189). 새 음성 파일은 만들지 않습니다.
// 화면 경로가 닿는 파일이라 타입과 순수 함수만 가져옵니다.

import { contentAudioSourceOf } from "../lib/content-audio";
import type { CatalogLessonItemPort } from "./catalog-lesson-types";

/**
 * 칩 원문(치환 전)마다 재생 주소입니다 — 받은 파일이 있는 첫 녹음, 없으면 `null`. 칩 하나도 소리가 없으면 `null`을
 * 돌려 문항에 키를 싣지 않습니다.
 */
export function catalogChipAudioOf(
  sources: readonly string[],
  port: Pick<CatalogLessonItemPort, "audioUrlOf" | "recordedAudioOf">,
): readonly (string | null)[] | null {
  const recordedAudioOf = port.recordedAudioOf;
  if (recordedAudioOf === undefined) return null;
  // 정답 뒤 음성과 달리 낱말 하나짜리도 찾습니다 — 칩 소리는 그 글자의 발음을 들려주는 자리라 같은 글자의 다른 뜻 녹음도
  // 같은 소리입니다(ADR-0189 D4).
  const sourceOf = (ko: string): string | null => {
    for (const id of recordedAudioOf(ko)) {
      const source = contentAudioSourceOf(id, ko, port.audioUrlOf);
      if (source !== null) return source;
    }
    return null;
  };
  const audio = sources.map(sourceOf);
  return audio.some((source) => source !== null) ? audio : null;
}

/** 조립 조각의 소리 키 조각입니다 — 소리 있는 조각이 있을 때만 `chipAudio`를 싣습니다. */
export function chipAudioField(
  sources: readonly string[],
  port: Pick<CatalogLessonItemPort, "audioUrlOf" | "recordedAudioOf">,
): { readonly chipAudio?: readonly (string | null)[] } {
  const chipAudio = catalogChipAudioOf(sources, port);
  return chipAudio === null ? {} : { chipAudio };
}

/** 단어 고르기 보기의 소리 키 조각입니다 — 소리 있는 보기가 있을 때만 `choiceAudio`를 싣습니다. */
export function choiceAudioField(
  sources: readonly string[],
  port: Pick<CatalogLessonItemPort, "audioUrlOf" | "recordedAudioOf">,
): { readonly choiceAudio?: readonly (string | null)[] } {
  const choiceAudio = catalogChipAudioOf(sources, port);
  return choiceAudio === null ? {} : { choiceAudio };
}
