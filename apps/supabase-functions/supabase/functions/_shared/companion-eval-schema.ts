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
  // 검사 · 답장: 적용 로맨스 수위(ADR-0164). 생략하면 standard. 성인이 아니면 open이어도 standard로 돈다(운영과 같다).
  romanceTier: z.enum(["open", "standard"]).optional(),
  // 검사 · 칩: 적용 로맨스 선(ADR-0168)을 바로 준다. 검사는 생략하면 수위 · 연령대로(open이면 open, 아니면 성인 hug · 그 밖 none),
  // 칩은 생략하면 none(옛 동작). 답장은 인물 · 말투 단계 · 수위로 운영처럼 정하므로 쓰지 않는다.
  romanceLine: z.enum(["none", "hug", "kiss", "close", "open"]).optional(),
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
  // 답장만: 친밀도 숫자(ADR-0180) — 연애 질문을 받는 태도의 구간. 생략하면 구간 줄 없음(첫 인사 · 선톡과 같다).
  intimacy: z.number().int().min(0).max(1000).optional(),
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
  // 답장만: 내 스토리 반응(ADR-0191 D5). 있으면 `text` 대신 운영의 반응 지시 · 앱 안내 글로 답을 만든다 — 인물이 학습자의 스토리에 다는 한두 줄.
  storyReaction: z
    .object({
      kind: z.enum(["word", "card", "photo", "text"]),
      ko: z.string().max(200),
      roman: z.string().max(400).optional(),
      meaning: z.string().max(300),
      exampleKo: z.string().max(120).nullable().optional(),
      // 역할(ADR-0191 D16): react · follow · word · quiz. 옛 각도 question · together는 follow로 읽는다.
      angle: z.enum(["word", "question", "quiz", "together", "react", "follow"]),
      // 사진 스토리만: 읽기 단계의 장면 설명 · 말 걸 거리.
      scene: z.string().max(600).nullable().optional(),
      hooks: z.array(z.string().max(120)).max(3).optional(),
      // 조합 스토리(D15): 글 · 배운 단어. 둘째 친구(D16): 먼저 단 친구의 반응.
      texts: z.array(z.string().max(200)).max(9).optional(),
      words: z
        .array(z.object({ ko: z.string().min(1).max(40), meaning: z.string().max(120) }))
        .max(8)
        .optional(),
      friendReply: z
        .object({ name: z.string().max(30), text: z.string().max(400) })
        .nullable()
        .optional(),
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
