// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// `POST /functions/v1/chat-send`의 요청 본문과, 스트림을 열기 전 오류 본문입니다.
// 요청 키는 기존 Edge Function(`delete-account`)처럼 snake_case이고, 응답 쪽(SSE · RPC 반환)은 camelCase입니다.
import { z } from "zod/mini";

import { preStreamErrorCodeSchema } from "./error-codes.ts";

/** 앞뒤 공백을 걷은 유저 메시지의 최대 글자 수(코드 포인트)입니다. */
export const CHAT_TEXT_MAX_LENGTH = 1000;

const codePointLength = (text: string) => [...text].length;

export const inputModeSchema = z.enum(["text", "voice"]);

/**
 * 턴 하나의 요청입니다. 모르는 키는 버립니다. `contract_version`은 정수면 통과시키고, 지원 여부는 서버가
 * `SUPPORTED_CONTRACT_VERSIONS`로 따로 가려 `unsupported_contract_version`을 냅니다 — 모양 오류와 갈라 두기 위해서입니다.
 */
export const chatSendRequestSchema = z.object({
  contract_version: z.int(),
  character_id: z.string().check(z.minLength(1), z.maxLength(64)),
  client_message_id: z.uuid({ version: "v4" }),
  text: z.string().check(
    z.refine((text) => {
      const length = codePointLength(text.trim());
      return length >= 1 && length <= CHAT_TEXT_MAX_LENGTH;
    }, "text-length"),
  ),
  input_mode: inputModeSchema,
  client_region: z.optional(z.string().check(z.regex(/^[A-Z]{2}$/))),
});

export type ChatSendRequest = z.infer<typeof chatSendRequestSchema>;

/**
 * 스트림을 열기 전 오류 본문입니다. `detail`의 모양은 코드마다 다르고(`docs/specs/ai-companion-api.md` §5),
 * 키가 늘어도 옛 클라이언트가 깨지지 않게 열린 레코드로 둡니다.
 */
export const preStreamErrorBodySchema = z.object({
  error: preStreamErrorCodeSchema,
  retryable: z.boolean(),
  detail: z.optional(z.record(z.string(), z.unknown())),
});

export type PreStreamErrorBody = z.infer<typeof preStreamErrorBodySchema>;
