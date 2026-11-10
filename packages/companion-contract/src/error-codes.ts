// 컴패니언 API의 에러 코드 표입니다. 스트림을 열기 전 오류는 HTTP 상태와 JSON 본문으로, 연 뒤의 오류는 SSE `error`
// 이벤트로 옵니다. 위기 프로토콜은 에러가 아니라 `crisis` 이벤트라 이 표에 없습니다.
import { z } from "zod/mini";

/** 스트림을 열기 전에 HTTP 오류로만 나는 코드와 그 상태 · 재시도 가능 여부입니다. */
export const PRE_STREAM_ERRORS = {
  method_not_allowed: { status: 405, retryable: false },
  invalid_session: { status: 401, retryable: false },
  invalid_request: { status: 400, retryable: false },
  unsupported_contract_version: { status: 400, retryable: false },
  not_available: { status: 403, retryable: false },
  character_not_found: { status: 404, retryable: false },
  age_restricted: { status: 403, retryable: false },
  temporarily_blocked: { status: 403, retryable: false },
  usage_time_limit: { status: 403, retryable: false },
  duplicate_message: { status: 409, retryable: false },
  turn_in_progress: { status: 409, retryable: true },
  not_latest_message: { status: 409, retryable: false },
  trial_exhausted: { status: 402, retryable: false },
  insufficient_credits: { status: 402, retryable: false },
  rate_limited: { status: 429, retryable: true },
  server_misconfigured: { status: 500, retryable: false },
  internal_error: { status: 500, retryable: true },
} as const;

/** 스트림을 연 뒤 SSE `error` 이벤트로 나는 코드와 재시도 가능 여부입니다. `internal_error`는 두 자리 모두에서 납니다. */
export const STREAM_ERRORS = {
  internal_error: { retryable: true },
  guardrail_blocked: { retryable: false },
  upstream_unavailable: { retryable: true },
} as const;

export type PreStreamErrorCode = keyof typeof PRE_STREAM_ERRORS;
export type StreamErrorCode = keyof typeof STREAM_ERRORS;

const preStreamCodes = Object.keys(PRE_STREAM_ERRORS) as [
  PreStreamErrorCode,
  ...PreStreamErrorCode[],
];
const streamCodes = Object.keys(STREAM_ERRORS) as [StreamErrorCode, ...StreamErrorCode[]];

export const preStreamErrorCodeSchema = z.enum(preStreamCodes);
export const streamErrorCodeSchema = z.enum(streamCodes);
