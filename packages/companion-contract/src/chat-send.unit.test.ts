import { describe, expect, test } from "vitest";

import { CHAT_TEXT_MAX_LENGTH, chatSendRequestSchema } from "./chat-send";
import { PRE_STREAM_ERRORS, STREAM_ERRORS } from "./error-codes";

const valid = {
  contract_version: 1,
  character_id: "duksu",
  client_message_id: "0b8f6c1e-2a3d-4b5c-9d6e-7f8091a2b3c4",
  text: "안녕하세요",
  input_mode: "text",
} as const;

describe("chat-send 요청", () => {
  test("CS1. 최소 요청이 통과하고 모르는 키는 버린다", () => {
    expect(chatSendRequestSchema.parse({ ...valid, extra: true })).toEqual(valid);
  });

  // CS2 — 길이는 앞뒤 공백을 걷은 코드 포인트로 셉니다. UTF-16 길이로 세면 이모지 · 일부 한자가 두 번 셉니다.
  test("CS2. 공백뿐인 글 · 상한을 넘는 글은 거부하고, 상한까지는 받는다", () => {
    expect(chatSendRequestSchema.safeParse({ ...valid, text: "   " }).success).toBe(false);
    expect(
      chatSendRequestSchema.safeParse({ ...valid, text: "가".repeat(CHAT_TEXT_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(
      chatSendRequestSchema.safeParse({ ...valid, text: ` ${"😀".repeat(CHAT_TEXT_MAX_LENGTH)} ` })
        .success,
    ).toBe(true);
  });

  test("CS3. client_message_id는 UUID v4 · client_region은 대문자 두 글자", () => {
    expect(
      chatSendRequestSchema.safeParse({ ...valid, client_message_id: "not-a-uuid" }).success,
    ).toBe(false);
    expect(chatSendRequestSchema.safeParse({ ...valid, client_region: "ph" }).success).toBe(false);
    expect(chatSendRequestSchema.safeParse({ ...valid, client_region: "PH" }).success).toBe(true);
  });

  test("CS3b. from_suggestion은 있으면 불리언", () => {
    expect(chatSendRequestSchema.parse({ ...valid, from_suggestion: true })).toEqual({
      ...valid,
      from_suggestion: true,
    });
    expect(chatSendRequestSchema.safeParse({ ...valid, from_suggestion: "yes" }).success).toBe(
      false,
    );
  });

  // CS4 — 모르는 판은 모양 오류가 아니라 `unsupported_contract_version`으로 갈라야 하므로, 스키마는 정수면 통과시킵니다.
  test("CS4. contract_version은 정수면 통과한다(판 지원 여부는 서버가 가린다)", () => {
    expect(chatSendRequestSchema.safeParse({ ...valid, contract_version: 99 }).success).toBe(true);
    expect(chatSendRequestSchema.safeParse({ ...valid, contract_version: 1.5 }).success).toBe(
      false,
    );
  });
});

describe("에러 코드 표", () => {
  // EC1 — 위기는 에러가 아닙니다. 에러 표에 들어가면 FE가 위기 안내를 오류 화면으로 그릴 수 있습니다.
  test("EC1. 위기 프로토콜은 어느 에러 표에도 없다", () => {
    const codes = [...Object.keys(PRE_STREAM_ERRORS), ...Object.keys(STREAM_ERRORS)];
    expect(codes.some((code) => code.includes("crisis"))).toBe(false);
  });

  test("EC2. 두 자리 모두에서 나는 코드는 internal_error 하나이고 재시도 가능 여부가 같다", () => {
    const both = Object.keys(STREAM_ERRORS).filter((code) => code in PRE_STREAM_ERRORS);
    expect(both).toEqual(["internal_error"]);
    expect(STREAM_ERRORS.internal_error.retryable).toBe(PRE_STREAM_ERRORS.internal_error.retryable);
  });
});
