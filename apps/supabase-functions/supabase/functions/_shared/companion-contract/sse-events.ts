// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// `chat-send` 스트림의 이벤트 열 종입니다. 한 이벤트는 SSE의 `event` 이름 · `id`(턴 안 0부터) · `data`(JSON)입니다.
// 친밀도 수치는 어느 이벤트에도 싣지 않습니다 — 유저에게 보이는 관계 결과는 말투 단계뿐입니다.
import { z } from "zod/mini";

import { streamErrorCodeSchema } from "./error-codes.ts";
import { replySuggestionSchema } from "./suggest.ts";

export const speechLevelSchema = z.enum(["polite", "casual", "slang"]);
export const segmentKindSchema = z.enum(["speech", "action", "narration"]);
export const noticeKindSchema = z.enum(["ai_disclosure", "minor_notice", "break_reminder"]);

const nonNegativeInt = z.int().check(z.nonnegative());

export const startDataSchema = z.object({
  contractVersion: z.int(),
  conversationId: z.uuid(),
  userMessageId: z.uuid(),
  assistantMessageId: z.uuid(),
  speechLevel: speechLevelSchema,
});

export const noticeDataSchema = z.object({ kind: noticeKindSchema });

export const deltaDataSchema = z.object({
  segment: nonNegativeInt,
  kind: segmentKindSchema,
  text: z.string(),
});

const correctionItemSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  reason: z.string(),
});

export const feedbackKindSchema = z.enum(["correction", "better", "l1_to_ko"]);

/**
 * 유저 메시지 하나의 피드백 카드입니다. 칸은 늘 모두 있고(없는 값은 null · 빈 배열), 앱은 고정 이름표로 그립니다 —
 * 올바른 문장(`corrected`) → 고칠 점 목록(`items` — 원문 표현 · 고친 표현 · 이유) → 분명히 도움이 될 때만 더 나은 표현(`better` — 표현 · 뜻 · 설명).
 * - `kind`: `correction`(틀린 곳을 고침) · `better`(맞지만 더 자연스럽게 — 비속어를 순화한 것 포함) · `l1_to_ko`(다른 언어가 섞인 말을
 *   자연스러운 한국어로). `status`가 `ok`가 아니면 null.
 * - `original`: 학습자가 보낸 메시지 그대로.
 * - `corrected`: 고친 · 자연스러운 한국어 문장 전체. `ok`면 늘 있다(`better`는 더 나은 문장 전체).
 * - `items`: 고칠 점마다 하나(한 메시지에 여럿일 수 있다 — 합치거나 빼지 않는다). 이유는 학습자 언어로 한 문장. `l1_to_ko`면 비어 있다.
 *   `corrected`는 모든 고침을 적용한 최종 문장이다.
 * - `better`: 덧붙이는 다른 자연스러운 표현 — 분명히 도움이 될 때만. `meaning` · `explanation`은 학습자 언어.
 * - `meaning`: `corrected`의 뜻(학습자 언어). `l1_to_ko`면 늘 있다.
 * `none`(고칠 것 없음)과 `unavailable`(생성 실패 · 시간 초과)도 한 번 와서, 받는 쪽이 기다림을 끝낼 수 있게 합니다.
 * `skipped`는 피드백을 만들지 않았다는 뜻입니다 — `reason: "suggestion"`이면 추천 답변 칩을 그대로 보낸 메시지입니다(앱: 「피드백 생략(추천 답변)」).
 * `reason`은 `skipped`일 때만 있습니다.
 * 2026-11-09 이전 판(kind마다 다른 모양 · `l1ToKo`)은 앱이 피드백을 쓰기 전이라 같은 계약 판(1)에서 바꿨습니다.
 */
export const correctionDataSchema = z.object({
  userMessageId: z.uuid(),
  status: z.enum(["ok", "none", "unavailable", "skipped"]),
  reason: z.optional(z.enum(["suggestion"])),
  kind: z.nullable(feedbackKindSchema),
  original: z.string(),
  corrected: z.nullable(z.string()),
  items: z.array(correctionItemSchema),
  better: z.nullable(z.object({ text: z.string(), meaning: z.string(), explanation: z.string() })),
  meaning: z.nullable(z.string()),
  /**
   * 학습자가 이 메시지에서 쓴 앱에서 배운 표현(PRD §3.7) — 있을 때만. 앱은 카드에 「배운 표현을 썼어요」를 붙인다(칭찬만, 점수 없음).
   * 칩을 그대로 보낸 메시지(`skipped`)에는 없다.
   */
  learnedUsed: z.optional(z.array(z.object({ id: z.string(), surface: z.string() }))),
});

export const translationDataSchema = z.object({ segment: nonNegativeInt, text: z.string() });

/**
 * 이 턴 캐릭터 답의 추천 답변 칩(`companion-suggest` 응답의 `items`와 같은 모양)입니다. 유저가 칩 스위치(`reply_suggestions`)를 켰을 때만,
 * 보통 답 턴에만 옵니다 — 끄면 · 위기 · 차단 · 거절 턴이면 오지 않습니다. 오면 한 번, `translation` 뒤 · `state` 앞입니다.
 * - `messageId`: 칩이 묶인 캐릭터 메시지(`start`의 `assistantMessageId`). 같은 칩이 그 메시지의 `suggestions`에 저장됩니다.
 * - `ok`면 `items`가 검증을 지난 1 ~ `settings.suggestion_display_max`개(기본 2 — 모델이 낸 후보 셋 가운데 의도가 서로 다른 것),
 *   `unavailable`이면 빈 배열과 `reason`(`generation_failed` — 모델 실패 · 시간 초과, `blocked` — 미성년자 · 나이 모름의 출력 검사,
 *   `no_valid_candidates` — 후보가 모두 검증에서 빠짐) — 앱은 `companion-suggest`(다시 만들기)로 대신 받을 수 있습니다.
 *   어느 쪽이든 입력창은 막지 않습니다.
 * 스위치가 켜져 있는데 이벤트가 없으면(옛 서버 등) 앱은 `companion-suggest`를 부릅니다.
 */
export const suggestionsDataSchema = z.object({
  messageId: z.uuid(),
  status: z.enum(["ok", "unavailable"]),
  items: z.array(replySuggestionSchema).check(z.maxLength(3)),
  reason: z.optional(z.enum(["generation_failed", "blocked", "no_valid_candidates"])),
});

/**
 * `memoryFull`: 이 캐릭터 기억이나 공유 기억이 상한에 닿았고 모두 유저가 고친 것이라 새 기억을 넣지 못한다 — 앱이 「기억이 가득
 * 찼어요 — 정리해 주세요」를 보입니다. 턴 시작 때 값입니다(이번 턴의 기억 추출은 스트림이 닫힌 뒤 돕니다). 서버가 모르면 없습니다.
 */
export const stateDataSchema = z.object({
  speechLevel: speechLevelSchema,
  speechLevelChanged: z.boolean(),
  memoryFull: z.optional(z.boolean()),
});

export const crisisResourceSchema = z.object({
  name: z.string(),
  phone: z.optional(z.string()),
  url: z.optional(z.string()),
  hours: z.optional(z.string()),
});

export const crisisDataSchema = z.object({
  resources: z.array(crisisResourceSchema),
  region: z.nullable(z.string()),
});

export const errorDataSchema = z.object({
  code: streamErrorCodeSchema,
  retryable: z.boolean(),
});

export const refusalStageSchema = z.enum(["deflect", "warn"]);

/**
 * `balance`는 크레딧이 없는 동안(M4 전) `null`입니다.
 * `refusal`은 입력 검사에 걸린 턴에서 캐릭터가 성격대로 거절한 답일 때만 있습니다 — `deflect`(피하고 화제를 돌림) · `warn`(그런 말은
 * 안 된다고 분명히 말함, 한 번 더 걸리면 일시 차단). 유저 메시지는 차단으로 저장되고 차감 · 피드백(`correction`)이 없습니다.
 */
export const doneDataSchema = z.object({
  assistantMessageId: z.uuid(),
  creditsSpent: nonNegativeInt,
  balance: z.nullable(nonNegativeInt),
  refusal: z.optional(z.object({ stage: refusalStageSchema })),
});

const eventOf = <Name extends string, Data extends z.ZodMiniType>(event: Name, data: Data) =>
  z.object({ event: z.literal(event), id: nonNegativeInt, data });

export const turnEventSchema = z.discriminatedUnion("event", [
  eventOf("start", startDataSchema),
  eventOf("notice", noticeDataSchema),
  eventOf("delta", deltaDataSchema),
  eventOf("correction", correctionDataSchema),
  eventOf("translation", translationDataSchema),
  eventOf("suggestions", suggestionsDataSchema),
  eventOf("state", stateDataSchema),
  eventOf("crisis", crisisDataSchema),
  eventOf("error", errorDataSchema),
  eventOf("done", doneDataSchema),
]);

export type TurnEvent = z.infer<typeof turnEventSchema>;
export type TurnEventName = TurnEvent["event"];
export type SpeechLevel = z.infer<typeof speechLevelSchema>;
export type SegmentKind = z.infer<typeof segmentKindSchema>;
export type NoticeKind = z.infer<typeof noticeKindSchema>;
export type RefusalStage = z.infer<typeof refusalStageSchema>;
