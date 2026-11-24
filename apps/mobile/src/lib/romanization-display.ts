// 대화 줄의 로마자 표시를 정하는 순수 함수입니다(ADR-0188 D1 · D3). UI를 import하지 않습니다.

import { romanizeKorean } from "./korean-romanize";
import type { ChoiceRomanization } from "./session-options";

/** 말풍선에 줄 로마자 · 뜻 묶음입니다 — ui-lynx ChatBubble `annotation`과 같은 모양입니다. */
export type BubbleAnnotation = {
  readonly romanization: string;
  readonly meaning: string;
  readonly spokenRomanization: string;
};

export type BubbleLines =
  | { readonly annotation: BubbleAnnotation }
  | { readonly translation: string }
  | Record<string, never>;

const HANGUL_SYLLABLE = /[가-힣]/;

/** 콘텐츠 로마자가 있으면 그것(trim), 없거나 비면 한글을 변환한 읽기입니다. 한글이 없으면 `null`. */
export function readingOf(ko: string, roman: string | null | undefined): string | null {
  const given = roman?.trim() ?? "";
  if (given !== "") return given;
  if (!HANGUL_SYLLABLE.test(ko)) return null;
  return romanizeKorean(ko).trim();
}

/**
 * 말풍선 아래 줄 — 켬이면 읽기(+ 뜻: 로마자 · 구분선 · 뜻 묶음), 끔이면 뜻 한 줄(이 변경 전 모양)입니다. 줄 것이 없으면 빈
 * 객체입니다.
 */
export function bubbleLinesOf(
  line: { readonly ko: string; readonly roman?: string | null; readonly meaning?: string | null },
  display: ChoiceRomanization,
  pronunciation: (romanization: string) => string,
): BubbleLines {
  const meaning = line.meaning?.trim() ?? "";
  const reading = display === "shown" ? readingOf(line.ko, line.roman) : null;
  if (reading !== null && meaning !== "") {
    return {
      annotation: { romanization: reading, meaning, spokenRomanization: pronunciation(reading) },
    };
  }
  if (reading !== null) return { translation: reading };
  return meaning === "" ? {} : { translation: meaning };
}
