// `companion-eval` 요청 본문 스키마(`companion-eval-handler.ts`에서 나눔). 단계마다 쓰는 칸은 함수 README 「companion-eval」.

import { z } from "zod";

/**
 * 고를 수 있는 모델. 대시보드가 이 목록으로 선택지를 그린다. `@medium`은 답변만 생각 깊이 medium으로 돈다(운영 기본 low —
 * `companionLlmWithModel`). 한 실행에서 low와 견주려고 둔다.
 */
export const evalModels = [
  "claude-haiku-5-5",
  "claude-haiku-5-5@medium",
  "claude-sonnet-5-5",
  "claude-opus-5-5",
] as const;

export const caseSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(2000),
  ageBand: z.enum(["adult", "minor", "unknown"]).optional(),
  // 검사 · 답장: 적용 로맨스 수위(ADR-0159). 생략하면 standard. 성인이 아니면 open이어도 standard로 돈다(운영과 같다).
  romanceTier: z.enum(["open", "standard"]).optional(),
  layer: z.enum(["input", "output_sync"]).optional(),
  l1: z.string().min(1).max(35).nullable().optional(),
  // 검사: 출력 검사 때 앞선 유저 메시지. 피드백: 바로 앞 캐릭터 말.
  context: z.string().max(2000).nullable().optional(),
  // 피드백만: 최근 대화(맥락, 오래된 것부터 — 운영처럼 마지막 6개만 쓴다).
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) }))
    .max(20)
    .optional(),
  // 피드백만: 관계 말투 단계 · 상대 캐릭터. 생략하면 모름(말투 규칙은 한 메시지 안 섞임만 본다).
  speechLevel: z.enum(["polite", "casual", "slang"]).nullable().optional(),
  character: z
    .object({
      name: z.string().min(1).max(64),
      role: z.string().max(200).nullable().optional(),
      banmalFeedback: z.enum(["correction", "better"]).optional(),
    })
    .nullable()
    .optional(),
  // 칩만: 대화 요약 · 이 대화에서 앞서 보인 칩 글(반복 검사 · 프롬프트의 지난 칩).
  summary: z.string().max(2000).nullable().optional(),
  pastSuggestions: z.array(z.string().max(200)).max(15).optional(),
  // 답장만: DB 캐릭터 카드 id(없거나 모르면 `character`의 이름만) · 배운 표현 · 기억 · 채점자에게만 주는 스포일러 메모.
  characterId: z.string().min(1).max(32).optional(),
  expressions: z
    .array(
      z.object({
        surface: z.string().min(1).max(200),
        gloss: z.string().max(300).nullable().optional(),
      }),
    )
    .max(40)
    .optional(),
  memories: z.array(z.string().min(1).max(300)).max(20).optional(),
  spoilerNote: z.string().max(1000).nullable().optional(),
  // 답장만: 끝낸 에피소드 — 운영처럼 「지금까지 이야기」 카드를 싣고 채점자가 canon 축을 본다.
  episodes: z.array(z.string().min(1).max(64)).max(80).optional(),
  // 학습 표현 · 답장: 넣을 배운 표현과 방식(노출 · 유도 · 칩 — 답장은 노출 · 유도만).
  target: z
    .object({
      surface: z.string().min(1).max(200),
      gloss: z.string().max(300).nullable().optional(),
      kind: z.enum(["voca", "expr", "patt", "gram", "nume"]).optional(),
      mode: z.enum(["expose", "elicit", "chip"]),
    })
    .optional(),
});
export const bodySchema = z.object({
  kind: z.enum(["moderation", "feedback", "translation", "suggestions", "learning", "reply"]),
  model: z.enum(evalModels).optional(),
  // 답장만: 채점 모델. 생략하면 `defaultJudgeModel` — 실행끼리 견주려면 바꾸지 않는다.
  judgeModel: z.enum(evalModels).optional(),
  cases: z.array(caseSchema).min(1).max(20),
});
export type EvalCase = z.infer<typeof caseSchema>;
export type EvalKind = z.infer<typeof bodySchema>["kind"];
