// 글자 소리의 주소입니다(ADR-0168). 소리 파일은 앱에 싣지 않고(ADR-0060 D1) 콘텐츠 버킷 `audio/letters/<로마자>.m4a`에 두고,
// 음성 정보 파일(`audio/manifest.json`)에 그 id가 있을 때만 소리가 있다고 봅니다 — 버킷에 올리기 전에는 정보 파일에 없어
// 스피커가 「unavailable」로 서고 칸은 그대로 눌립니다. 주소는 내려받은 파일 → 원격 순으로 콘텐츠 해석을 따릅니다.

import { contentAudioSourceOf } from "../../lib/content-audio";
import { letterAudioIdOf } from "../../lib/letters/jamo";

export type LetterAudioPort = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly audioTimingOf: (audioId: string) => unknown;
};

export function letterAudioSourceOf(syllable: string, port: LetterAudioPort): string | null {
  const id = letterAudioIdOf(syllable);
  if (id === null || port.audioTimingOf(id) == null) return null;
  return contentAudioSourceOf(id, syllable, port.imageUrlOf);
}
