// 기억 추출 평가 세트(ADR-0210). `GET ?docs=1`의 `memoryEvalSets`로 나간다 — 대시보드의 `evalSets`(답장 · 검사)와 모양이 달라 따로 둔다.
// 세트마다 `POST { kind: "memory", cases }`로 돌리고 `memoryVerdict(output, expect[id])`로 견준다. 운영에서 본 실패를 하나씩 담았다:
// 칩을 그대로 고른 말이 사실로 저장 · 「한국어를 배움」 같은 뻔한 기억 · 「내일」이 날짜 없이 남음 · 존댓말 · 「학습자는」 문체.
// 날짜는 모두 2026-11-27(금).

import type { EvalCase } from "./companion-eval-schema.ts";
import type { MemoryEvalOutput } from "./companion-eval-memory.ts";

export type MemoryExpect = {
  /** 작업 수의 상한(0이면 바꿀 것이 없어야 한다). */
  readonly maxOps?: number;
  /** 더하기 · 고치기 글 어느 하나가 맞아야 하는 정규식. */
  readonly require?: string;
  /** 더하기 · 고치기 글 어느 것도 맞으면 안 되는 정규식. */
  readonly forbid?: string;
  /** 고치기 · 잊기로 건드려야 하는 기존 기억 번호. */
  readonly touch?: string;
};

export type MemoryEvalSet = {
  readonly id: string;
  readonly title: string;
  readonly kind: "memory";
  readonly cases: readonly EvalCase[];
  readonly expect: Readonly<Record<string, MemoryExpect>>;
};

const day = "2026-11-27";
const greet = { role: "assistant" as const, text: "안녕하세요! 덕수쌤이에요. 한국어는 왜 배워요?" };

export const memoryEvalSets: readonly MemoryEvalSet[] = [
  {
    id: "memory-basics",
    title: "기억 추출 — 칩 · 뻔한 말 · 날짜 · 문체 · 고치기",
    kind: "memory",
    cases: [
      {
        id: "MEM1-picked-only",
        history: [greet, { role: "user", text: "저는 한국 드라마를 좋아해요.", picked: true }],
        text: "네",
        localDate: day,
      },
      { id: "MEM2-trivial", history: [greet], text: "저 한국어 배우고 있어요!", localDate: day },
      {
        id: "MEM3-why",
        history: [greet],
        text: "남자친구가 한국 사람이라서 배우고 있어요",
        localDate: day,
      },
      {
        id: "MEM4-tomorrow",
        history: [{ role: "assistant", text: "오늘 하루 어땠어요?" }],
        text: "내일 아침에 비자 인터뷰가 있어서 너무 떨려요",
        localDate: day,
      },
      {
        id: "MEM5-update",
        memories: ["12월에 서울 여행을 갈 계획임"],
        history: [{ role: "assistant", text: "서울 여행 준비는 잘 돼요?" }],
        text: "서울 여행 취소했어요. 돈이 모자라서요 ㅠㅠ",
        localDate: day,
      },
      {
        id: "MEM6-style",
        history: [{ role: "assistant", text: "어디에 살아요? 무슨 일 해요?" }],
        text: "저는 마닐라에 살고 간호사로 일해요",
        localDate: day,
      },
      {
        id: "MEM7-picked-then-manual",
        history: [
          { role: "assistant", text: "한국 음식 중에 뭘 제일 좋아해요?" },
          { role: "user", text: "저는 떡볶이를 제일 좋아해요.", picked: true },
          { role: "assistant", text: "오, 떡볶이! 맵지 않아요?" },
        ],
        text: "사실 저는 매운 거 잘 못 먹어요",
        localDate: day,
      },
      {
        id: "MEM8-already-known",
        memories: ["고양이 두 마리를 키움"],
        history: [{ role: "assistant", text: "고양이들은 잘 지내요?" }],
        text: "네! 우리 고양이들 오늘도 너무 귀여웠어요",
        localDate: day,
      },
      {
        id: "MEM9-minor-health",
        ageBand: "minor",
        history: [{ role: "assistant", text: "요즘 어떻게 지내요?" }],
        text: "요즘 너무 우울해서 밤에 잠을 못 자요",
        localDate: day,
      },
      {
        id: "MEM10-character-fact",
        history: [{ role: "assistant", text: "나 다음 주에 부산 가! 바다 보러." }],
        text: "와 좋겠다",
        localDate: day,
      },
    ],
    expect: {
      "MEM1-picked-only": { maxOps: 0 },
      "MEM2-trivial": { maxOps: 0 },
      "MEM3-why": { require: "남자친구", forbid: "^한국어를? ?(배우|공부)" },
      "MEM4-tomorrow": { require: "11월 ?28일|28일" },
      "MEM5-update": { touch: "m1", forbid: "서울 여행을 갈 계획" },
      "MEM6-style": { require: "마닐라|간호사" },
      "MEM7-picked-then-manual": { forbid: "떡볶이를? (제일 )?좋아" },
      "MEM8-already-known": { maxOps: 0 },
      "MEM9-minor-health": { maxOps: 0 },
      "MEM10-character-fact": { maxOps: 0 },
    },
  },
];

/** 기억 케이스 하나의 판정 — 쓰기 규칙(`problems`)과 기대를 함께 본다. 실패 까닭이 없으면 통과. */
export function memoryVerdict(output: MemoryEvalOutput, expect: MemoryExpect = {}) {
  const reasons: string[] = [];
  const written = output.ops.flatMap((op) => (op.op === "forget" ? [] : [op.content]));
  for (const op of output.ops)
    if (op.problems.length > 0)
      reasons.push(`${op.op === "forget" ? op.ref : op.content}: ${op.problems.join(",")}`);
  if (expect.maxOps !== undefined && output.ops.length > expect.maxOps)
    reasons.push(`ops ${output.ops.length} > ${expect.maxOps}`);
  if (expect.require && !written.some((text) => new RegExp(expect.require!).test(text)))
    reasons.push(`missing /${expect.require}/`);
  if (expect.forbid && written.some((text) => new RegExp(expect.forbid!).test(text)))
    reasons.push(`forbidden /${expect.forbid}/`);
  if (expect.touch && !output.ops.some((op) => op.op !== "add" && op.ref === expect.touch))
    reasons.push(`untouched ${expect.touch}`);
  return { pass: reasons.length === 0, reasons };
}
