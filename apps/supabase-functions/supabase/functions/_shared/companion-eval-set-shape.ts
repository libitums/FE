// 고정 평가 세트(`companion-eval-sets.ts`)의 모양과 답장 세트 도우미.

import type { EvalCase, EvalKind } from "./companion-eval-schema.ts";

export type EvalVerdict = {
  readonly action: "allow" | "block" | "crisis";
  readonly category?: string;
};

export type EvalSet = {
  readonly id: string;
  readonly title: string;
  readonly kind: Extract<EvalKind, "reply" | "moderation">;
  readonly cases: readonly EvalCase[];
  /** 검사 세트만: 케이스 id → 기대 판정(분류가 없으면 조치만 본다). */
  readonly expect?: Readonly<Record<string, EvalVerdict>>;
};

/** 답장 케이스 하나 — [id, 학습자 말, 채점자 메모, 덧붙일 칸]. */
export type ReplyRow = readonly [string, string, string, Partial<EvalCase>?];

/** 한 인물의 답장 세트. 기본: 성인 · 존댓말 · 학습자 언어 en · 적용 수위 standard. */
export function replySet(
  id: string,
  characterId: string,
  title: string,
  rows: readonly ReplyRow[],
): EvalSet {
  return {
    id,
    title,
    kind: "reply",
    cases: rows.map(([caseId, text, note, extra]) => ({
      id: caseId,
      text,
      characterId,
      ageBand: "adult",
      romanceTier: "standard",
      speechLevel: "polite",
      l1: "en",
      spoilerNote: note,
      ...extra,
    })),
  };
}
