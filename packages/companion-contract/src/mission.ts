// 롤플레이 미션(2단계, ADR-0177)의 정의와 함수 요청 · 응답입니다. 정의는 저장소의 미션 파일이 정본이고
// (`apps/supabase-functions/supabase/functions/_shared/missions/`) 스크립트가 서버 표로 올립니다 — 이 스키마가 그 파일의 모양입니다.
// 요청 키는 `chat-send`처럼 snake_case, 응답은 camelCase입니다(정의만 미션 파일 그대로 camelCase).
import { z } from "zod/mini";

import { chatSendRequestSchema } from "./chat-send";
import { preStreamErrorCodeSchema } from "./error-codes";

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

/**
 * 화면에 보이는 글. 영어는 늘 있고 한국어는 선택입니다. 그 밖의 언어는 BCP 47 태그를 키로 하는 선택 칸입니다(`ja` · `vi` …, PRD §9 M6).
 * 미션 파일에는 사람이 검수한 번역을 넣고, 서버 응답에는 학습자 언어(`l1`)의 칸이 채워져 옵니다(파일에 없으면 자동 번역 — 검수 전 초안).
 * 앱은 `label[l1] ?? label.en`을 씁니다.
 */
export const missionLabelSchema = z.catchall(
  z.object({ en: text(120), ko: z.optional(text(120)) }),
  text(240),
);

export const missionGoalSchema = z.object({
  id: missionGoalIdSchema,
  required: z.boolean(),
  label: missionLabelSchema,
  /** 채점자 · 상대역 모델에게 주는 판정 기준(한국어 한 문장). 학습자에게는 보이지 않는다. */
  criteria: text(300),
  /**
   * 누가 이 목표를 꺼내는가(연출 지시 `mission-direction.ts`). `counterpart`(기본) — 상대역이 자연스럽게 물어 기회를 연다(예: 「영수증
   * 드릴까요?」). `learner` — 학습자가 먼저 꺼내야 한다(예: 가격 묻기): 상대역은 묻지도, 그 내용을 먼저 말하지도 않고 여지만 둔다.
   */
  opener: z.optional(z.enum(["counterpart", "learner"])),
  /** `counterpart` 목표에서 상대역이 기회를 열 때 쓸 수 있는 한국어 한 줄(예: 「결제는 어떻게 하시겠어요?」). 학습자 쪽 말이 아니다. */
  cue: z.optional(text(120)),
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

/** 진입 대사. 그 밖의 언어는 `missionLabelSchema`처럼 BCP 47 태그를 키로 하는 선택 칸(사람이 검수한 번역). */
export const missionOpeningSchema = z.catchall(
  z.object({ ko: text(200), roman: text(300), en: text(300) }),
  text(400),
);

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
      (mission) =>
        mission.goals.every((goal) => goal.opener !== "learner" || goal.cue === undefined),
      "learner-goal-has-no-cue",
    ),
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

/**
 * 판이 끝난 까닭(채점하는 판). 성공 · 실패는 이것이 아니라 필수 목표의 달성으로 정한다(`missionOutcomeSchema`).
 * - `goals`: 모든 목표(필수 + 선택)를 이룸 — 자동으로 닫힌다. 선택 목표가 없는 미션은 필수를 이루는 순간이다.
 * - `turn_limit`: 학습자 턴이 상한에 닿음 — 필수를 이뤘으면 성공, 아니면 실패.
 * - `finish`: 필수를 모두 이룬 뒤 학습자가 끝내기를 누름(`mission-finish`, `abandon` 없이) — 늘 성공.
 */
export const missionEndReasonSchema = z.enum(["goals", "turn_limit", "finish"]);
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
  /** 학습자 언어(BCP 47) — `opening.translation`과 목표 글의 `label[l1]`이 이 언어다. 모르면 null(영어). 옛 서버에는 없다. */
  l1: z.optional(z.nullable(z.string())),
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

// ------------------------------------------------------------------ 미션 함수의 오류

/**
 * 미션 함수(`mission-start` · `mission-hint` · `mission-finish`)와 미션 턴의 `chat-send`가 스트림 전에 내는 미션 전용 오류입니다.
 * 계정 단위 거절(`not_available` · `insufficient_credits` · `age_restricted` …)은 1단계 표(`PRE_STREAM_ERRORS`)를 그대로 씁니다.
 * - `mission_not_found`: 판이 없음 · 남의 판 · 컴패니언 대화 · 없는 미션.
 * - `mission_closed`: 이미 닫힌 판(그만둠 · 채점 끝). `mission_ended`: 끝난 판(모든 목표 · 턴 상한 · 끝내기) — 앱은 `mission-finish`를 부른다.
 * - `mission_not_ended`: 필수 목표를 아직 못 이룬 판을 채점하려 함(그만두려면 `abandon: true`). 필수를 이룬 판은 끝내기로 닫혀 채점된다.
 * - `hint_limit` · `no_goal_left`: 힌트를 줄 수 없음. `hint_unavailable`: 힌트 문장 만들기가 실패(힌트 수는 이미 셌다).
 */
export const MISSION_ERRORS = {
  mission_not_found: { status: 404, retryable: false },
  mission_closed: { status: 409, retryable: false },
  mission_ended: { status: 409, retryable: false },
  mission_not_ended: { status: 409, retryable: false },
  hint_limit: { status: 409, retryable: false },
  no_goal_left: { status: 409, retryable: false },
  hint_unavailable: { status: 503, retryable: true },
} as const;

export type MissionErrorCode = keyof typeof MISSION_ERRORS;

const missionErrorCodes = Object.keys(MISSION_ERRORS) as [MissionErrorCode, ...MissionErrorCode[]];

/** 미션 함수의 오류 본문 — 1단계 오류 본문과 같은 모양에 미션 코드를 더한 것. */
export const missionErrorBodySchema = z.object({
  error: z.union([preStreamErrorCodeSchema, z.enum(missionErrorCodes)]),
  retryable: z.boolean(),
  detail: z.optional(z.record(z.string(), z.unknown())),
});

export type MissionErrorBody = z.infer<typeof missionErrorBodySchema>;
export type MissionEndReason = z.infer<typeof missionEndReasonSchema>;
export type MissionOutcome = z.infer<typeof missionOutcomeSchema>;
export type MissionGoalState = z.infer<typeof missionGoalStateSchema>;
export type MissionStartRequest = z.infer<typeof missionStartRequestSchema>;
export type MissionStartResponse = z.infer<typeof missionStartResponseSchema>;
export type MissionTurnRequest = z.infer<typeof missionTurnRequestSchema>;
export type MissionHintRequest = z.infer<typeof missionHintRequestSchema>;
export type MissionHintResponse = z.infer<typeof missionHintResponseSchema>;
