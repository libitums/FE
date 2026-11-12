// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// `POST /functions/v1/companion-greet`의 요청 · 응답입니다 — 대화가 비었을 때 캐릭터가 먼저 거는 첫 인사(새 대화 · 대화 초기화 뒤).
// 앱은 캐릭터 화면을 열 때 메시지가 하나도 없으면 부릅니다. 메시지가 이미 있으면 아무것도 만들지 않고 `none`을 돌려주므로 두 번 불러도
// 인사는 하나입니다. 무료입니다(크레딧 · 체험 횟수를 쓰지 않습니다). 요청 키는 `chat-send`처럼 snake_case, 응답은 camelCase입니다.
import { z } from "zod/mini";

import { segmentSchema } from "./rpc.ts";
import { suggestionsDataSchema } from "./sse-events.ts";

/**
 * 앱은 JWT와 `character_id`만 보냅니다. `user_id`는 서버 키로 부르는 ops-dashboard 플레이그라운드용이고, 앱 토큰으로 보내면
 * 거절됩니다.
 */
export const companionGreetRequestSchema = z.object({
  character_id: z.string().check(z.minLength(1), z.maxLength(64)),
  user_id: z.optional(z.uuid()),
});

/**
 * `status`가 `ok`가 아닐 때의 이유입니다.
 * - `none` · `has_messages`: 대화에 메시지가 이미 있습니다(다른 호출이 먼저 인사를 저장한 경우 포함) — 메시지 목록을 읽으면 됩니다.
 * - `unavailable`: 지금 대화할 수 없습니다(`chat-send` 판정과 같은 이유).
 */
export const greetReasonSchema = z.enum([
  "has_messages",
  "not_available",
  "age_restricted",
  "temporarily_blocked",
  "usage_time_limit",
  "turn_in_progress",
]);

/**
 * 응답 본문(HTTP 200)입니다. `ok`면 저장된 인사 메시지(`messageId`, 메시지 목록에서는 `origin: "greeting"`)의 말풍선(L1 번역 포함)과
 * 출처(`model` — 모델이 만듦, `canned` — 생성 실패 · 출력 검사 차단이라 페르소나의 정해진 인사)입니다. `suggestions`는 칩 스위치가 켜져
 * 있을 때 그 인사에 붙은 추천 답변 칩(SSE `suggestions`와 같은 모양)이고, 꺼져 있으면 null입니다.
 */
export const companionGreetResponseSchema = z.object({
  status: z.enum(["ok", "none", "unavailable"]),
  messageId: z.nullable(z.uuid()),
  segments: z.array(segmentSchema),
  source: z.optional(z.enum(["model", "canned"])),
  suggestions: z.nullable(suggestionsDataSchema),
  reason: z.optional(greetReasonSchema),
});

export type CompanionGreetRequest = z.infer<typeof companionGreetRequestSchema>;
export type CompanionGreetResponse = z.infer<typeof companionGreetResponseSchema>;
export type GreetReason = z.infer<typeof greetReasonSchema>;
