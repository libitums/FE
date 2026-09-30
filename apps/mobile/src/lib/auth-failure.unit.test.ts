import { expect, test } from "vitest";

import type { AuthFailureReason } from "./auth-session.contract";
import { authFailureMessage } from "./auth-failure";

// 리터럴을 단언하지 않습니다 — 값은 spec §5.3 표가 정본이고, 문구를 다듬을 때
// unit이 막지 않게 합니다. 망라는 tsc(spec §8 N6)가 집니다.
const allReasons: readonly AuthFailureReason[] = [
  "network",
  "unavailable",
  "unconfigured",
  "rate-limited",
  "rejected",
  "invalid-code",
  "sign-in-incomplete",
  "unsupported",
];

test("AF1. 여덟 이유 전부가 비지 않은 문자열이고 서로 다르다", () => {
  const messages = allReasons.map((reason) => authFailureMessage(reason));

  for (const message of messages) {
    expect(message.trim().length).toBeGreaterThan(0);
  }
  expect(new Set(messages).size).toBe(allReasons.length);
});
