import { describe, expect, test } from "vitest";

import { chatReplyOptionLabel } from "./chat-reply-option";

// `unit` 계층(MC-U25): 답장 보기 낭독 문자열(spec §4.1) — 비지 않은 줄만 「, 」로 잇는다.

describe("chatReplyOptionLabel", () => {
  test("MC-U25. 아래 줄이 빈 문자열뿐이면 첫 줄만 — 끝 쉼표가 없다", () => {
    expect(chatReplyOptionLabel("아니요", [""])).toBe("아니요");
  });

  test("MC-U25. 줄이 없으면 첫 줄만이다", () => {
    expect(chatReplyOptionLabel("아니요", [])).toBe("아니요");
  });

  test("MC-U25. 두 줄 이상이면 「, 」로 잇는다", () => {
    expect(chatReplyOptionLabel("네", ["ne", "Yes"])).toBe("네, ne, Yes");
  });

  test("MC-U25. 중간의 빈 줄은 건너뛴다", () => {
    expect(chatReplyOptionLabel("네", ["", "Yes"])).toBe("네, Yes");
  });
});
