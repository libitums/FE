// 미션 상대역 답 다듬기(ADR-0177 D13 · D14) — 학습자 화면 · TTS로 나가기 전에 코드가 거르는 셋. 순수 함수입니다.
//
// 1. 혼잣말(D14): Haiku(effort low)가 답 안에 영어로 「Wait — I must follow the director's note … Revise: …」 같은 생각 · 수정 과정을
//    쓰고 이어서 고쳐 쓴 답을 내는 일이 있었다(조율자 QA). 메타 줄(라틴 낱말 3개 이상 연속, 또는 메타 낱말)을 찾으면 그 줄과
//    **그 앞의 모든 조각**(버려진 초안)을 버리고 뒤의 것만 쓴다. 한국어 답에 라틴 낱말이 필요한 일은 거의 없어 보수적으로 잡는다.
// 2. 작별 인사(D13): 판이 이 턴에 끝나지 않으면 인사 문장(`counterpart.farewells`)을 뺀다.
// 3. 대신 묻기(D14): 학습자가 꺼낼 목표가 남았으면 「다른 필요하신 거 있으세요?」 류(`counterpart.noOffer`)의 문장을 뺀다.
// 말이 하나도 안 남으면 호출하는 쪽이 한 번 다시 만들고, 그래도 안 되면 혼잣말 탓이면 미션의 안전한 한 줄(`counterpart.fallback`).

import type { Segment } from "./chat-send.contract.ts";
import type { MissionDefinition } from "./mission-definition.ts";
import { farewellsOf } from "./mission-guards.ts";

export const defaultNoOffer = [
  "다른 필요하신",
  "더 필요하신",
  "필요하신 거 있으세요",
  "필요한 거 있으세요",
  "다른 거 필요",
  "더 필요한 거",
] as const;
export const defaultFallbackLine = "네? 다시 한번 말씀해 주시겠어요?";

export const noOfferOf = (mission: MissionDefinition): readonly string[] =>
  mission.counterpart.noOffer ?? defaultNoOffer;
export const fallbackLineOf = (mission: MissionDefinition): string =>
  mission.counterpart.fallback ?? defaultFallbackLine;

/** 혼잣말로 보는 메타 낱말(대소문자 무시, 낱말 단위). */
const metaWord =
  /\b(director|note|goals?|learner|system|prompt|revise|revised|instructions?|wait|output|reply|scene)\b/i;
const latinRun = /[A-Za-z]+(?:['’][A-Za-z]+)?(?:[\s,.;:!?—–-]+[A-Za-z]+(?:['’][A-Za-z]+)?){2,}/;

/** 이 줄이 혼잣말(모델의 생각 · 지시 되뇌기)인가 — 라틴 낱말 3개 이상 연속이거나 메타 낱말이 있다. */
export const isMonologueLine = (line: string): boolean =>
  latinRun.test(line) || (/[A-Za-z]/.test(line) && metaWord.test(line));

const sentences = (text: string): string[] => text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [text];

/** 조각들을 (조각 번호, 줄) 목록으로 펴서 마지막 혼잣말 줄 뒤만 남긴다. */
export function stripMonologue(segments: readonly Segment[]): {
  segments: Segment[];
  found: boolean;
} {
  const lines = segments.flatMap((segment, index) =>
    segment.text.split("\n").map((text) => ({ index, kind: segment.kind, text })),
  );
  let last = -1;
  lines.forEach((line, at) => {
    if (isMonologueLine(line.text)) last = at;
  });
  if (last === -1) return { segments: [...segments], found: false };
  const kept = lines.slice(last + 1).filter((line) => line.text.trim() !== "");
  // 같은 조각에서 온 줄끼리 다시 한 조각으로 잇는다.
  const out: { index: number; segment: Segment }[] = [];
  for (const line of kept) {
    const prev = out.at(-1);
    if (prev !== undefined && prev.index === line.index)
      prev.segment = { ...prev.segment, text: `${prev.segment.text} ${line.text.trim()}` };
    else out.push({ index: line.index, segment: { kind: line.kind, text: line.text.trim() } });
  }
  return { segments: out.map((entry) => entry.segment), found: true };
}

/** 말 조각에서 `phrases` 중 하나가 든 문장을 뺀다. 빈 조각은 버린다. */
export function stripSentences(
  segments: readonly Segment[],
  phrases: readonly string[],
): { segments: Segment[]; stripped: boolean } {
  let stripped = false;
  const out: Segment[] = [];
  for (const segment of segments) {
    if (segment.kind !== "speech" || phrases.length === 0) {
      out.push(segment);
      continue;
    }
    const kept = sentences(segment.text).filter((part) => {
      const hit = phrases.some((phrase) => part.includes(phrase));
      if (hit) stripped = true;
      return !hit;
    });
    const text = kept.join("").trim();
    if (text !== "") out.push({ ...segment, text });
  }
  return { segments: out, stripped };
}

export type CleanIssue = "monologue" | "farewell" | "offer";

/**
 * 답 하나 다듬기. `endsNow` — 이 턴에 판이 끝나는가(판정 기준). 끝나면 인사 · 대신 묻기는 그대로 둔다(혼잣말은 늘 거른다).
 */
export function cleanReply(
  mission: MissionDefinition,
  goalsDone: readonly string[],
  segments: readonly Segment[],
  endsNow: boolean,
): { segments: Segment[]; issues: CleanIssue[]; speechLeft: boolean } {
  const issues: CleanIssue[] = [];
  const mono = stripMonologue(segments);
  if (mono.found) issues.push("monologue");
  let out = mono.segments;
  if (!endsNow) {
    const bye = stripSentences(out, farewellsOf(mission));
    if (bye.stripped) issues.push("farewell");
    out = bye.segments;
    const learnerOpen = mission.goals.some(
      (goal) => goal.opener === "learner" && !goalsDone.includes(goal.id),
    );
    if (learnerOpen) {
      const offer = stripSentences(out, noOfferOf(mission));
      if (offer.stripped) issues.push("offer");
      out = offer.segments;
    }
  }
  return { segments: out, issues, speechLeft: out.some((segment) => segment.kind === "speech") };
}
