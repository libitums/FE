// 발음 기준의 너그러운 말하기 판정입니다(순수). 앱의 말하기 문항 · 롤플레이(`judgeSpokenAnswer`)와 랜딩 체험판
// (`judgeSpokenLenient`)이 같은 잣대를 씁니다.
//
// 정답을 문장 부호로 마디(「안녕하세요 · 네 · 처음이에요」)로 나누고, 마디마다 들은 문장 안의 가장 비슷한 연속 구간과
// 발음형 자모 편집 거리를 잽니다. 뒤에 덧붙은 **낱말**과 마디 순서 바뀜은 허용하고, 마디 하나를 통째로 빠뜨리면 하한이 막습니다.
// 이름 · 나라(와일드카드)가 든 낱말은 마디를 끊는 자리로만 쓰고 비교에서 뺍니다.
//
// 뜻이 반대인 답은 길이 허용 오차로 넘어가지 않습니다(ADR-0201 개정 ⟨부정어 · 앞 낱말 · 어간⟩).
//   - 들은 말에만 있는 부정 낱말(안 · 못 · 아니 · 없 · 않 · 싫 · 모르 · -지 마)이 있으면 오답(`negationMismatch`).
//   - 들은 말 **앞**에 덧붙은 낱말은 군말만 공짜이고 나머지는 거리로 셉니다(「이거 사과」 ≠ 「사과」).
//   - 낱말 첫 음절의 자모가 다른 자모로 바뀌면 오답입니다(「가세요」 ≠ 「계세요」).
//
// 허용 오차는 비율 하나가 아니라 정답 길이로 정합니다 — 짧은 말은 자모 하나가 뜻을 바꿉니다(고기 / 거기).
//   자모 5개 이하: 0개(발음형이 같아야) · 6 ~ 11개: 1개 · 12개 이상: 25%(내림).

import { spokenTrackOf } from "./hangul-pronunciation";
import type { SpokenTrack } from "./hangul-pronunciation";
import type { NonEmpty } from "./non-empty";
import { judgeRoleplayReplyExact } from "./roleplay-reply";
import { alignWindow, stemPositions } from "./spoken-align";
import { negationMismatch } from "./spoken-negation";
import { speakingWords } from "./speaking-judge";

/** 긴 정답(자모 12개 이상)에서 일치도가 이 값 이상이면 발음 기준 정답입니다. */
export const SPOKEN_LENIENT_THRESHOLD = 0.75;
/** 정답의 마디(부호로 자른 조각) 하나라도 이 값 아래면 정답이 아닙니다 — 절반만 말한 경우를 막습니다. */
export const SPOKEN_SEGMENT_FLOOR = 0.5;
/** 자모가 이 수 미만인 마디(「네」 · 「응」 같은 맞장구)는 하한을 보지 않습니다 — 빠뜨려도 전체 허용 오차가 받습니다. */
export const SPOKEN_FLOOR_MIN_UNITS = 3;
/** 자모가 이 수 이하인 정답은 발음형이 같아야 맞습니다. */
export const SPOKEN_EXACT_MAX_UNITS = 5;
/** 자모가 이 수 이하인 정답은 한 개까지 틀려도 맞습니다. 그보다 길면 25%까지. */
export const SPOKEN_ONE_SLIP_MAX_UNITS = 11;

export type SpokenOutcome = "strict" | "lenient" | "incorrect";
export type SpokenSimilarity = {
  /** 0 ~ 1. 1 − 거리 / 길이. */
  readonly similarity: number;
  /** 가장 약한 마디의 일치도(자모 3개 미만 마디는 빼고, 그런 마디뿐이면 1). */
  readonly weakest: number;
  /** 마디마다 잰 편집 거리의 합. */
  readonly distance: number;
  /** 비교한 정답 자모 수(와일드카드 낱말 제외). 0이면 비교할 것이 없습니다. */
  readonly length: number;
  /** 낱말 첫 음절 자모가 다른 자모로 바뀐 수. 0이 아니면 통과하지 않습니다. */
  readonly stemSlips: number;
};
export type SpokenJudgement = {
  readonly outcome: SpokenOutcome;
  /** 0 ~ 1, 소수 셋째 자리. */
  readonly similarity: number;
  /** 판정에 쓴 대안(incorrect면 첫 대안, 없으면 ""). */
  readonly heard: string;
  /** 가장 가까운 정답. */
  readonly expected: string;
};

const round = (value: number) => Math.round(value * 1000) / 1000;
const toNfc = (text: string) =>
  typeof text.normalize === "function" ? text.normalize("NFC") : text;

function containsWildcard(word: string, pieces: readonly string[]): boolean {
  return pieces.some((piece) => piece !== "" && word.includes(piece));
}

type Segments = {
  /** 마디마다의 발음형 열(빈 마디 제외). */
  readonly tracks: readonly SpokenTrack[];
  /** 정답이 와일드카드 낱말로 시작하면 들은 말 앞의 낱말은 그 자리입니다(공짜). */
  readonly leadingFree: boolean;
};

/** 정답을 마디로 나눈 발음형 열들 — 문장 부호와 와일드카드 낱말이 마디를 끊고, 와일드카드 낱말은 버립니다. */
function segmentsOf(expected: string, wildcards: readonly string[]): Segments {
  const pieces = wildcards.flatMap((wildcard) => speakingWords(wildcard));
  const firstWord = speakingWords(expected)[0];
  const tracks = toNfc(expected)
    .split(/[.,!?…~]+/)
    .flatMap((segment) => {
      const groups: string[][] = [[]];
      for (const word of segment.split(/\s+/)) {
        if (word === "") continue;
        if (containsWildcard(word, pieces)) groups.push([]);
        else groups[groups.length - 1]?.push(word);
      }
      return groups.map((group) => group.join(" "));
    })
    .map((text) => spokenTrackOf(text))
    .filter((track) => track.units.length > 0);
  return {
    tracks,
    leadingFree: firstWord !== undefined && containsWildcard(firstWord, pieces),
  };
}

export function spokenSimilarity(
  expected: string,
  heard: string,
  wildcards: readonly string[] = [],
): SpokenSimilarity {
  const heardTrack = spokenTrackOf(heard);
  const { tracks, leadingFree } = segmentsOf(expected, wildcards);
  let distance = 0;
  let length = 0;
  let weakest = 1;
  let stemSlips = 0;
  let firstStart = heardTrack.units.length;
  for (const track of tracks) {
    const segment = track.units;
    const aligned = alignWindow(segment, stemPositions(track), heardTrack);
    distance += aligned.distance;
    length += segment.length;
    stemSlips += aligned.stemSlips;
    firstStart = Math.min(firstStart, aligned.start);
    if (segment.length >= SPOKEN_FLOOR_MIN_UNITS) {
      weakest = Math.min(weakest, 1 - aligned.distance / segment.length);
    }
  }
  if (length === 0) return { similarity: 0, weakest: 0, distance: 0, length: 0, stemSlips: 0 };
  // 들은 말 앞에 덧붙은 낱말(군말은 이미 빠짐)은 빠짐없이 거리로 셉니다.
  if (!leadingFree) distance += firstStart;
  return {
    similarity: Math.max(0, 1 - distance / length),
    weakest: Math.max(0, weakest),
    distance,
    length,
    stemSlips,
  };
}

/** 정답 자모 수에 따른 허용 편집 거리입니다. */
export function spokenAllowedDistance(length: number): number {
  if (length <= SPOKEN_EXACT_MAX_UNITS) return 0;
  if (length <= SPOKEN_ONE_SLIP_MAX_UNITS) return 1;
  return Math.floor(length * (1 - SPOKEN_LENIENT_THRESHOLD));
}

/** 발음 기준 통과 — 허용 오차 안이고 빠뜨린 마디 · 바뀐 첫 음절이 없습니다. */
export function spokenPasses(score: SpokenSimilarity): boolean {
  return (
    score.length > 0 &&
    score.distance <= spokenAllowedDistance(score.length) &&
    score.weakest >= SPOKEN_SEGMENT_FLOOR &&
    score.stemSlips === 0
  );
}

/**
 * 엄격 규칙(`judgeRoleplayReplyExact`)으로 맞는 대안이 있으면 strict, 아니면 (정답 × 대안) 중 통과하는 가장 높은 쌍으로
 * lenient, 없으면 incorrect. 같은 값이면 먼저 온 정답 · 대안입니다.
 */
export function judgeSpokenLenient(
  accepted: NonEmpty<string>,
  alternatives: readonly string[],
): SpokenJudgement {
  const closest = (heard: string) =>
    accepted
      .map((sentence) => ({ sentence, score: spokenSimilarity(sentence, heard) }))
      .reduce((best, entry) => (entry.score.similarity > best.score.similarity ? entry : best));
  const strict = alternatives.find((heard) =>
    accepted.some(
      (sentence) =>
        !negationMismatch(sentence, heard) &&
        judgeRoleplayReplyExact([sentence], heard, []) === "correct",
    ),
  );
  if (strict !== undefined) {
    return { outcome: "strict", similarity: 1, heard: strict, expected: closest(strict).sentence };
  }
  let best = { heard: alternatives[0] ?? "", sentence: accepted[0], similarity: 0, pass: false };
  for (const heard of alternatives) {
    for (const sentence of accepted) {
      const score = spokenSimilarity(sentence, heard);
      const pass = spokenPasses(score) && !negationMismatch(sentence, heard);
      const better = pass === best.pass ? score.similarity > best.similarity : pass;
      if (better) best = { heard, sentence, similarity: score.similarity, pass };
    }
  }
  return {
    outcome: best.pass ? "lenient" : "incorrect",
    similarity: round(best.similarity),
    heard: best.pass ? best.heard : (alternatives[0] ?? ""),
    expected: best.sentence,
  };
}
