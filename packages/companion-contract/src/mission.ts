// 롤플레이 미션(2단계, ADR-0160)의 정의와 함수 요청 · 응답입니다. 정의는 저장소의 미션 파일이 정본이고
// (`apps/supabase-functions/supabase/functions/_shared/missions/`) 스크립트가 서버 표로 올립니다 — 이 스키마가 그 파일의 모양입니다.
// 요청 키는 `chat-send`처럼 snake_case, 응답은 camelCase입니다(정의만 미션 파일 그대로 camelCase).
import { z } from "zod/mini";

import { chatSendRequestSchema } from "./chat-send";

/** 학습자 턴 상한의 허용 범위입니다(PRD §9 M2 — 초안 8 ~ 10). */
export const MISSION_TURN_LIMIT_MIN = 3;
export const MISSION_TURN_LIMIT_MAX = 20;

const text = (max: number) => z.string().check(z.minLength(1), z.maxLength(max));
const nonNegativeInt = z.int().check(z.nonnegative());

/** 미션 id — 소문자 · 숫자를 하이픈으로 이은 것(보통 에피소드 id와 같다, 예: `u06-cafe`). */
export const missionIdSchema = z
  .string()
  .check(z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), z.maxLength(64));
/** 목표 id — 소문자로 시작하는 짧은 이름(예: `order`). 상태 줄의 `goals_done`에 이 글자 그대로 온다. */
export const missionGoalIdSchema = z.string().check(z.regex(/^[a-z][a-z0-9_]{0,31}$/));
/** 콘텐츠의 표현 id(`patt:83586289` · `expr:…` · `voca:…`) — 접두사 넷 글자 + 16진 여덟 자리. */
export const expressionIdSchema = z.string().check(z.regex(/^[a-z]{4}:[0-9a-f]{8}$/));

/** 화면에 보이는 글. 영어는 늘 있고 한국어는 선택입니다(다른 언어는 PRD §9 M6). */
export const missionLabelSchema = z.object({ en: text(120), ko: z.optional(text(120)) });

export const missionGoalSchema = z.object({
  id: missionGoalIdSchema,
  required: z.boolean(),
  label: missionLabelSchema,
  /** 채점자 · 상대역 모델에게 주는 판정 기준(한국어 한 문장). 학습자에게는 보이지 않는다. */
  criteria: text(300),
});

export const missionTargetExpressionSchema = z.object({
  id: expressionIdSchema,
  /** 콘텐츠의 표현 그대로(빈칸 `{음료}` 포함). 단위 테스트가 에피소드 파일과 같은지 본다. */
  ko: text(120),
  meaning: text(200),
});

/** 캐스트의 바탕 네 칸(페르소나 카드의 `name` · `age` · `job` · `speech`). 서버는 DB 카드가 있으면 그것을 먼저 쓴다. */
export const missionCounterpartBaseSchema = z.object({
  name: text(40),
  age: z.optional(text(40)),
  job: z.optional(text(200)),
  speech: z.optional(text(300)),
});

export const missionCounterpartSchema = z.object({
  /** 캐스트면 `companion.characters.id`. 단역이면 없다. */
  characterId: z.optional(z.string().check(z.minLength(1), z.maxLength(64))),
  /** 화면에 보이는 호칭(예: 「카페 직원」 — 본편 시점에 이름을 모르면 이름을 쓰지 않는다). */
  label: text(40),
  role: text(300),
  relation: text(300),
  register: text(300),
  samples: z.array(text(120)).check(z.minLength(1), z.maxLength(8)),
  base: z.optional(missionCounterpartBaseSchema),
});

export const missionOpeningSchema = z.object({ ko: text(200), roman: text(300), en: text(300) });

const unique = (values: readonly string[]) => new Set(values).size === values.length;

/** 미션 파일 하나(PRD 부록 A). 목표 id · 표현 id는 겹치지 않고, 필수 목표가 하나 이상 있어야 합니다. */
export const missionDefinitionSchema = z
  .object({
    id: missionIdSchema,
    episodeId: missionIdSchema,
    /** 내용을 바꾸면 올립니다 — 결과 행이 어느 판의 정의로 채점됐는지 남깁니다. */
    version: z.int().check(z.gte(1)),
    title: missionLabelSchema,
    scene: text(500),
    counterpart: missionCounterpartSchema,
    opening: missionOpeningSchema,
    goals: z.array(missionGoalSchema).check(z.minLength(1), z.maxLength(8)),
    targetExpressions: z.array(missionTargetExpressionSchema).check(z.maxLength(6)),
    turnLimit: z.int().check(z.gte(MISSION_TURN_LIMIT_MIN), z.lte(MISSION_TURN_LIMIT_MAX)),
  })
  .check(
    z.refine((mission) => unique(mission.goals.map((goal) => goal.id)), "goal-ids-unique"),
    z.refine((mission) => mission.goals.some((goal) => goal.required), "required-goal-missing"),
    z.refine(
      (mission) => unique(mission.targetExpressions.map((entry) => entry.id)),
      "expression-ids-unique",
    ),
  );

export type MissionDefinition = z.infer<typeof missionDefinitionSchema>;
export type MissionGoal = z.infer<typeof missionGoalSchema>;
export type MissionTargetExpression = z.infer<typeof missionTargetExpressionSchema>;
export type MissionCounterpartBase = z.infer<typeof missionCounterpartBaseSchema>;

// ------------------------------------------------------------------ 판의 값

/** 판이 끝난 까닭 — 필수 목표를 모두 이룸(성공) · 학습자 턴이 상한에 닿음(실패). */
export const missionEndReasonSchema = z.enum(["goals", "turn_limit"]);
export const missionOutcomeSchema = z.enum(["success", "fail"]);

/** 화면의 목표 한 줄 — 글과 지금의 달성. */
export const missionGoalStateSchema = z.object({
  id: missionGoalIdSchema,
  required: z.boolean(),
  label: missionLabelSchema,
  done: z.boolean(),
});

// ------------------------------------------------------------------ mission-start

export const missionStartRequestSchema = z.object({
  contract_version: z.int(),
  mission_id: missionIdSchema,
});

/** 이번 판의 값 — 하루 무료 횟수로 냈는지, 엽전으로 냈는지와 그 양(무료면 0). */
export const missionChargeSchema = z.object({
  source: z.enum(["free", "credits"]),
  credits: nonNegativeInt,
});

export const missionStartResponseSchema = z.object({
  /** 판의 id(`conversations.id`, `kind = 'mission'`). 이 판의 `chat-send` · `mission-hint` · `mission-finish`에 싣는다. */
  conversationId: z.uuid(),
  missionId: missionIdSchema,
  missionVersion: z.int().check(z.gte(1)),
  title: missionLabelSchema,
  scene: z.string(),
  counterpart: z.object({ label: z.string(), characterId: z.nullable(z.string()) }),
  /** 진입 대사 — 상대역의 첫 메시지로 저장된 것. `translation`은 학습자 언어(없으면 null — 앱은 `en`을 쓴다). */
  opening: z.object({
    messageId: z.uuid(),
    ko: z.string(),
    roman: z.string(),
    en: z.string(),
    translation: z.nullable(z.string()),
  }),
  goals: z.array(missionGoalStateSchema),
  turnLimit: z.int(),
  turnsLeft: nonNegativeInt,
  hintsLeft: nonNegativeInt,
  charge: missionChargeSchema,
});

// ------------------------------------------------------------------ 턴(chat-send)

/**
 * 미션 턴의 `chat-send` 요청입니다. `chatSendRequestSchema`에 `conversation_id`(필수)를 더하고 `character_id`를 선택으로 푼 것 —
 * 단역 상대역은 캐릭터 id가 없습니다. 서버는 `conversation_id`가 있으면 미션 턴으로 갈라 이 스키마로 다시 읽습니다.
 */
export const missionTurnRequestSchema = z.extend(chatSendRequestSchema, {
  character_id: z.optional(z.string().check(z.minLength(1), z.maxLength(64))),
  conversation_id: z.uuid(),
});

// ------------------------------------------------------------------ mission-hint

export const missionHintRequestSchema = z.object({
  contract_version: z.int(),
  conversation_id: z.uuid(),
});

/** 아직 못 이룬 목표 하나(필수 먼저 · 파일 순서)의 예시 문장 하나. `meaning`은 학습자 언어. */
export const missionHintResponseSchema = z.object({
  goalId: missionGoalIdSchema,
  ko: z.string().check(z.minLength(1)),
  roman: z.string(),
  meaning: z.string(),
  hintsLeft: nonNegativeInt,
});

export type MissionEndReason = z.infer<typeof missionEndReasonSchema>;
export type MissionOutcome = z.infer<typeof missionOutcomeSchema>;
export type MissionGoalState = z.infer<typeof missionGoalStateSchema>;
export type MissionStartRequest = z.infer<typeof missionStartRequestSchema>;
export type MissionStartResponse = z.infer<typeof missionStartResponseSchema>;
export type MissionTurnRequest = z.infer<typeof missionTurnRequestSchema>;
export type MissionHintRequest = z.infer<typeof missionHintRequestSchema>;
export type MissionHintResponse = z.infer<typeof missionHintResponseSchema>;
