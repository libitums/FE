// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// 롤플레이 미션의 끝 · 리포트 · 목록입니다(ADR-0193, PRD §3.6 ~ §3.8 · §4.1 · §6). `mission-finish` 요청 · 응답과
// 창구 함수 `companion_list_missions()` · `companion_list_mission_results(p_mission_id)`의 반환 모양입니다.
import { z } from "zod/mini";

import {
  expressionIdSchema,
  missionEndReasonSchema,
  missionGoalIdSchema,
  missionIdSchema,
  missionLabelSchema,
  missionOutcomeSchema,
} from "./mission.ts";
import { feedbackKindSchema } from "./sse-events.ts";

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

/** 점수식의 항(가중치를 곱한 값, 소수 첫째 자리)과 힌트 감점 — 최종 = max(0, round(task + accuracy + expression) − hintPenalty). */
export const missionScorePartsSchema = z.object({
  task: z.number(),
  accuracy: z.number(),
  expression: z.number(),
  hintPenalty: z.number(),
});

/** 한국어 한 줄과 학습자 언어의 뜻. */
const missionLineSchema = z.object({ ko: z.string(), meaning: z.string() });

/**
 * 리포트 한 장(PRD §3.8 · 부록 B). 세부 점수는 소수일 수 있고 최종 점수는 정수다.
 * 학습자 언어 칸: headline · summary · nextStep · retry[].meaning · goals[].tip.meaning · focus[].reason · strengths[].note ·
 * corrections[].items[].reason. 한국어 칸: retry[].ko · goals[].tip.ko · corrections · focus[].examples · 인용(evidence · quote).
 * 「(선택)」 칸은 2026-11-23에 더한 것 — 그 앞의 결과 행에는 없다.
 */
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
  /** (선택) 점수식의 항 — 앱이 보여 줄지와 별개로 데이터에 남긴다. */
  scoreParts: z.optional(missionScorePartsSchema),
  /** (선택) 결과 한 줄(학습자 언어, 숫자 없음). */
  headline: z.optional(z.string()),
  goals: z.array(
    z.object({
      id: missionGoalIdSchema,
      required: z.boolean(),
      label: missionLabelSchema,
      done: z.boolean(),
      /** 채점자가 근거로 든 학습자 발화. 턴에서만 달성됐거나 못 이뤘으면 null. */
      evidence: z.nullable(z.string()),
      /** (선택) 못 이룬 목표의 「이렇게 말하면 됐어요」 한 줄. 이룬 목표면 null. */
      tip: z.optional(z.nullable(missionLineSchema)),
    }),
  ),
  expressions: z.array(
    z.object({ id: expressionIdSchema, ko: z.string(), meaning: z.string(), used: z.boolean() }),
  ),
  /** 턴마다 저장된 교정(`companion.corrections`)을 모은 것 — 새로 만들지 않는다. */
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      kind: z.nullable(feedbackKindSchema),
      /** (선택) 턴 교정의 조각 — 까닭(`reason`)은 학습자 언어. 서버의 교정 카드 그대로. */
      items: z.optional(
        z.array(z.object({ original: z.string(), corrected: z.string(), reason: z.string() })),
      ),
    }),
  ),
  /**
   * (선택) 꼭 볼 고친 문장 0 ~ 3묶음 — 채점자가 위 `corrections`에서 중요한 것을 골라 같은 유형끼리 묶은 것. 원문 → 고친 문장은
   * 턴 교정 그대로(새로 만들지 않는다), `reason`은 묶음의 한 줄(학습자 언어, 문법 용어 없이).
   */
  focus: z.optional(
    z
      .array(
        z.object({
          examples: z.array(z.object({ original: z.string(), corrected: z.string() })),
          reason: z.string(),
        }),
      )
      .check(z.maxLength(3)),
  ),
  /** (선택) 잘한 점 0 ~ 2개 — 학습자 발화 인용(`quote`)과 한 줄(`note`, 학습자 언어). */
  strengths: z.optional(
    z.array(z.object({ quote: z.string(), note: z.string() })).check(z.maxLength(2)),
  ),
  /** 다시 해 볼 표현 1 ~ 3개(못 쓴 목표 표현 · 못 이룬 목표의 예시). `meaning`은 학습자 언어. */
  retry: z.array(missionLineSchema).check(z.maxLength(3)),
  /** 두세 줄의 총평(학습자 언어) — 잘한 점 하나 · 고칠 점 하나 · 격려. 숫자 없음. */
  summary: z.string(),
  /** (선택) 다음 도전 한 줄(학습자 언어). */
  nextStep: z.optional(z.string()),
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
  /** 학습자 언어 — 목표 글의 `label[l1]`이 이 언어다(번역이 준비된 것만). 모르면 null. 옛 서버에는 없다. */
  l1: z.optional(z.nullable(z.string())),
  /**
   * (선택, 2026-11-23) 채점 대기 판 — 필수 목표를 이룬 채 방치 · 새 판 시작으로 닫혀 아직 채점되지 않은 판. 앱은 판마다 `mission-finish`를
   * 불러 그때 채점한 리포트를 받는다(게으른 채점). 옛 서버에는 없다.
   */
  pendingReports: z.optional(
    z.array(
      z.object({
        conversationId: z.uuid(),
        missionId: missionIdSchema,
        endedAt: z.nullable(z.string()),
      }),
    ),
  ),
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
export type MissionScoreParts = z.infer<typeof missionScorePartsSchema>;
export type MissionReport = z.infer<typeof missionReportSchema>;
export type MissionPrice = z.infer<typeof missionPriceSchema>;
export type MissionListItem = z.infer<typeof missionListItemSchema>;
export type MissionList = z.infer<typeof missionListSchema>;
export type MissionResults = z.infer<typeof missionResultsSchema>;
