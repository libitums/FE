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
  /**
   * 추천 답변 칩을 탭해 보냈으면 그 칩입니다 — 칩이 묶인 캐릭터 메시지(`suggestions`의 `messageId`)와 `items`의 자리. 서버는
   * `message_id`가 지금 마지막 캐릭터 메시지이고 `text`가 그 자리의 칩과 (앞뒤 공백을 걷고) 똑같을 때만 칩을 그대로 보낸 것으로 보고
   * 피드백을 건너뜁니다(`correction`의 `status: "skipped"`). 그 사이 새 답이 왔으면 지난 칩(stale), 글이 다르면 직접 입력으로 보고
   * 보통처럼 피드백합니다. 칩 수정은 없습니다 — 입력 길은 탭 전송 · 직접 입력 둘뿐이고(2026-11-10), 직접 입력이면 보내지 않습니다.
   */
  suggestion: z.optional(
    z.object({
      message_id: z.uuid(),
      index: z.int().check(z.gte(0), z.lte(2)),
    }),
  ),
  /** 옛 표시(`suggestion` 앞). 참이면 마지막 캐릭터 메시지의 칩 어느 하나와 글이 같을 때 피드백을 건너뜁니다. */
  from_suggestion: z.optional(z.boolean()),
  /**
   * 고쳐서 다시 보내기(PRD §3.15): 고칠 유저 메시지의 id. 그 대화의 마지막 유저 메시지여야 하고(그 뒤에 그 답이 아닌 캐릭터
   * 메시지도 없어야), 아니면 409 `not_latest_message`. 서버가 이전 턴(유저 메시지 · 캐릭터 답)을 숨기고 이 글로 새 턴을 돕니다 —
   * 차감 · 검사는 보통 턴과 같습니다. 이 칸이 있으면 `suggestion` · `from_suggestion`은 보지 않습니다(직접 입력).
   */
  replaces_message_id: z.optional(z.uuid()),
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
