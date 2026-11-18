// 롤플레이 미션의 끝 · 리포트 · 목록입니다(ADR-0160, PRD §3.6 ~ §3.8 · §4.1 · §6). `mission-finish` 요청 · 응답과
// 창구 함수 `companion_list_missions()` · `companion_list_mission_results(p_mission_id)`의 반환 모양입니다.
import { z } from "zod/mini";

import {
  expressionIdSchema,
  missionEndReasonSchema,
  missionGoalIdSchema,
  missionIdSchema,
  missionLabelSchema,
  missionOutcomeSchema,
} from "./mission";
import { feedbackKindSchema } from "./sse-events";

const nonNegativeInt = z.int().check(z.nonnegative());
const score = z.number().check(z.gte(0), z.lte(100));
const totalScore = z.int().check(z.gte(0), z.lte(100));

// ------------------------------------------------------------------ mission-finish · 리포트

/** `abandon`이 참이면 그만둠 — 리포트 · 환불 없이 판을 닫는다(PRD §3.6). */
export const missionFinishRequestSchema = z.object({
  contract_version: z.int(),
  conversation_id: z.uuid(),
  abandon: z.optional(z.boolean()),
});

/** 점수식의 가중치와 힌트 감점 — 결과 행에 그때의 값을 함께 남긴다(PRD §3.7). */
export const missionWeightsSchema = z.object({
  task: z.number(),
  accuracy: z.number(),
  expression: z.number(),
  hintPenalty: z.number(),
});

/** 리포트 한 장(PRD §3.8 · 부록 B). 세부 점수는 소수일 수 있고 최종 점수는 정수다. */
export const missionReportSchema = z.object({
  conversationId: z.uuid(),
  missionId: missionIdSchema,
  missionVersion: z.int().check(z.gte(1)),
  outcome: missionOutcomeSchema,
  endReason: missionEndReasonSchema,
  totalScore,
  taskScore: score,
  accuracyScore: score,
  expressionScore: score,
  hintsUsed: nonNegativeInt,
  weights: missionWeightsSchema,
  goals: z.array(
    z.object({
      id: missionGoalIdSchema,
      required: z.boolean(),
      label: missionLabelSchema,
      done: z.boolean(),
      /** 채점자가 근거로 든 학습자 발화. 턴에서만 달성됐거나 못 이뤘으면 null. */
      evidence: z.nullable(z.string()),
    }),
  ),
  expressions: z.array(
    z.object({ id: expressionIdSchema, ko: z.string(), meaning: z.string(), used: z.boolean() }),
  ),
  /** 턴마다 저장된 교정(`companion.corrections`)을 모은 것 — 새로 만들지 않는다. */
  corrections: z.array(
    z.object({ original: z.string(), corrected: z.string(), kind: z.nullable(feedbackKindSchema) }),
  ),
  /** 다시 해 볼 표현 1 ~ 3개(못 쓴 목표 표현 · 못 이룬 목표의 예시). `meaning`은 학습자 언어. */
  retry: z.array(z.object({ ko: z.string(), meaning: z.string() })).check(z.maxLength(3)),
  /** 한두 줄의 총평(학습자 언어). */
  summary: z.string(),
  /** 이 미션 안의 최고 기록(이 판 포함). */
  bestScore: z.nullable(totalScore),
  graderModel: z.string(),
  createdAt: z.string(),
});

/**
 * 응답 본문(HTTP 200). `graded`는 리포트, `abandoned`는 그만둠, `grading_failed`는 채점 호출이 실패해 값을 돌려준 것 —
 * 같은 요청을 다시 보내면 대화가 아니라 채점만 다시 돈다. 몇 번 불러도 같은 결과(채점이 이미 있으면 그대로)다.
 */
export const missionFinishResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("graded"), report: missionReportSchema }),
  z.object({ status: z.literal("abandoned"), conversationId: z.uuid() }),
  z.object({
    status: z.literal("grading_failed"),
    conversationId: z.uuid(),
    retryable: z.boolean(),
    refunded: z.boolean(),
  }),
]);

// ------------------------------------------------------------------ 목록(창구 함수)

/** 이번 판의 값 — 하루 무료 횟수가 남았으면 그것을 먼저 쓰고, 다 쓰면 엽전 정액(PRD §3.9). 사용자 단위라 미션마다 같다. */
export const missionPriceSchema = z.object({
  freeLeft: nonNegativeInt,
  cost: nonNegativeInt,
  /** 지금 엽전 잔액. 지갑이 없으면 null. */
  balance: z.nullable(nonNegativeInt),
});

/** 미리보기 한 칸(PRD §4.1). 장면 그림은 에피소드 id로 앱이 고른다. */
export const missionListItemSchema = z.object({
  id: missionIdSchema,
  episodeId: missionIdSchema,
  version: z.int().check(z.gte(1)),
  title: missionLabelSchema,
  counterpartLabel: z.string(),
  characterId: z.nullable(z.string()),
  goals: z.array(
    z.object({ id: missionGoalIdSchema, required: z.boolean(), label: missionLabelSchema }),
  ),
  turnLimit: z.int(),
  /** 그 에피소드를 끝냈는가(진행 스냅숏의 `catalogProgress`). */
  unlocked: z.boolean(),
  best: z.nullable(z.object({ totalScore, outcome: missionOutcomeSchema, createdAt: z.string() })),
});

/** `companion_list_missions()`의 반환. 미션 스위치가 꺼져 있으면 `missions`가 비어 있다. */
export const missionListSchema = z.object({
  missions: z.array(missionListItemSchema),
  price: missionPriceSchema,
});

/** `companion_list_mission_results(p_mission_id)`의 반환 — 지난 리포트 전부(최신이 앞)와 최고 기록. */
export const missionResultsSchema = z.object({
  missionId: missionIdSchema,
  bestScore: z.nullable(totalScore),
  results: z.array(missionReportSchema),
});

export type MissionFinishRequest = z.infer<typeof missionFinishRequestSchema>;
export type MissionFinishResponse = z.infer<typeof missionFinishResponseSchema>;
export type MissionWeights = z.infer<typeof missionWeightsSchema>;
export type MissionReport = z.infer<typeof missionReportSchema>;
export type MissionPrice = z.infer<typeof missionPriceSchema>;
export type MissionListItem = z.infer<typeof missionListItemSchema>;
export type MissionList = z.infer<typeof missionListSchema>;
export type MissionResults = z.infer<typeof missionResultsSchema>;
