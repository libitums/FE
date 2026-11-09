// ops-dashboard(Python)가 받는 JSON Schema를 계약 스키마에서 뽑습니다. 산출물은 `json-schema/`에 커밋하고,
// 단위 테스트가 다시 뽑은 결과와 견줘 어긋나면 실패합니다(`pnpm --filter @libitums/companion-contract json-schema`로 갱신).
import { z } from "zod/mini";

import { chatSendRequestSchema, preStreamErrorBodySchema } from "./chat-send";
import {
  companionCharacterSchema,
  companionMemoryListSchema,
  companionMemorySchema,
  companionMessagesPageSchema,
  companionProfileSchema,
  companionWalletSchema,
} from "./rpc";
import { turnEventSchema } from "./sse-events";

const schemas = {
  "chat-send-request": chatSendRequestSchema,
  "pre-stream-error": preStreamErrorBodySchema,
  "turn-event": turnEventSchema,
  "companion-profile": companionProfileSchema,
  "companion-character": companionCharacterSchema,
  "companion-messages-page": companionMessagesPageSchema,
  "companion-memory": companionMemorySchema,
  "companion-memories": companionMemoryListSchema,
  "companion-wallet": companionWalletSchema,
} as const;

/** 산출 파일 이름(확장자 없음) → JSON Schema(draft 2020-12)입니다. 이름 순으로 돌려줍니다. */
export function contractJsonSchemas(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(schemas).sort() as (keyof typeof schemas)[]) {
    // 정제(`refine`)는 JSON Schema로 옮겨지지 않아 버립니다 — 길이 같은 정제 규칙은 서버가 다시 검사합니다.
    out[name] = z.toJSONSchema(schemas[name], { unrepresentable: "any" });
  }
  return out;
}
