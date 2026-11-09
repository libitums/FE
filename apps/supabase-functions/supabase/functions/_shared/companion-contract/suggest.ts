// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// `POST /functions/v1/companion-suggest`의 요청 · 응답입니다 — 추천 답변 칩(학습자가 탭해서 보낼 수 있는 다음 말 셋).
// 칩 스위치가 켜져 있으면 `chat-send`가 캐릭터 답마다 같은 칩을 SSE `suggestions`로 보내고, 이 함수는 「다시 만들기」(`refresh`)와 자동 칩이
// `unavailable`이었거나 오지 않은 턴에 부릅니다. 요청 키는 `chat-send`처럼 snake_case, 응답은 camelCase입니다.
import { z } from "zod/mini";

/** 칩 셋의 몫 — 대화 이어 가기 · 캐릭터에게 되묻기 · 짧은 리액션. 응답에는 이 순서로 하나씩 옵니다. */
export const suggestionIntentSchema = z.enum(["continue", "ask", "react"]);

export const replySuggestionSchema = z.object({
  /** 학습자가 그대로 보낼 수 있는 한국어 한 줄입니다. `*행동*` 없이 말만 담습니다. */
  text: z.string().check(z.minLength(1)),
  /** `text`의 뜻(학습자 언어). 학습자 언어가 한국어면 null입니다. */
  meaning: z.nullable(z.string()),
  intent: suggestionIntentSchema,
});

/**
 * 앱은 JWT와 `character_id`만 보냅니다. `user_id`는 서버 키로 부르는 ops-dashboard 플레이그라운드용이고, 앱 토큰으로 보내면
 * 거절됩니다. `refresh`가 참이면 저장된 칩을 버리고 새로 만듭니다.
 */
export const companionSuggestRequestSchema = z.object({
  character_id: z.string().check(z.minLength(1), z.maxLength(64)),
  user_id: z.optional(z.uuid()),
  refresh: z.optional(z.boolean()),
});

/**
 * `status`가 `ok`가 아닐 때의 이유입니다.
 * - `none`: 지금은 추천할 자리가 아닙니다 — 캐릭터 답이 아직 없음 · 마지막 턴이 차단 · 위기 · 거절 · 유저가 설정에서 끔.
 * - `unavailable`: 지금 대화할 수 없거나(`chat-send` 판정과 같은 이유) 만들지 못했습니다(모델 실패 · 출력 검사 차단).
 */
export const suggestReasonSchema = z.enum([
  "no_assistant_message",
  "latest_turn_blocked",
  "latest_turn_crisis",
  "latest_turn_refusal",
  "suggestions_off",
  "not_available",
  "age_restricted",
  "temporarily_blocked",
  "usage_time_limit",
  "turn_in_progress",
  "generation_failed",
  "blocked",
]);

/**
 * 응답 본문(HTTP 200)입니다. `ok`면 `items`가 정확히 셋(continue · ask · react 순서)이고 `messageId`는 칩이 묶인 마지막 캐릭터
 * 메시지입니다 — 새 턴이 오면 그 id가 바뀌어 캐시가 저절로 무효가 됩니다. `cached`는 저장된 칩을 그대로 돌려줬는지입니다.
 */
export const companionSuggestResponseSchema = z.object({
  status: z.enum(["ok", "none", "unavailable"]),
  messageId: z.nullable(z.uuid()),
  items: z.array(replySuggestionSchema),
  cached: z.boolean(),
  reason: z.optional(suggestReasonSchema),
});

export type SuggestionIntent = z.infer<typeof suggestionIntentSchema>;
export type ReplySuggestion = z.infer<typeof replySuggestionSchema>;
export type CompanionSuggestRequest = z.infer<typeof companionSuggestRequestSchema>;
export type CompanionSuggestResponse = z.infer<typeof companionSuggestResponseSchema>;
export type SuggestReason = z.infer<typeof suggestReasonSchema>;
