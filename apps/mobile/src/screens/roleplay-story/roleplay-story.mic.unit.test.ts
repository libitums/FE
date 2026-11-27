import { expect, test } from "vitest";

import { markedUiCopy } from "../../lib/ui-copy.test-support";
import { roleplayTalkReducer, initialRoleplayTalkState } from "./roleplay-story";
import { roleplayRetryable, unavailableMessage } from "./RoleplaySpeakControls";

// `unit` 계층: 롤플레이의 인식 실패(failed)는 거부와 다른 문구 · 다시 말하기(ADR-0206 D5).

test("RS-P1. 인식 실패 안내는 거부 안내와 다른 문구다", () => {
  expect(unavailableMessage("failed", markedUiCopy)).toBe("⟦micPermission.listenFailed⟧");
  expect(unavailableMessage("blocked", markedUiCopy)).toBe("⟦roleplayStory.blocked⟧");
});

test("RS-P2. Try again은 못 알아들음과 인식 실패에만 선다(거부 · 받아쓰기 꺼짐은 아님)", () => {
  expect(roleplayRetryable("missed", null)).toBe(true);
  expect(roleplayRetryable("unavailable", "failed")).toBe(true);
  expect(roleplayRetryable("unavailable", "blocked")).toBe(false);
  expect(roleplayRetryable("unavailable", "dictation-off")).toBe(false);
  expect(roleplayRetryable("ready", null)).toBe(false);
});

test("RS-P3. 인식 실패 뒤 start는 다시 듣는 중이고 Try again 자리를 지킨다(retrying)", () => {
  const failed = roleplayTalkReducer(
    roleplayTalkReducer(initialRoleplayTalkState, { type: "start" }),
    { type: "unavailable", reason: "failed" },
  );
  const next = roleplayTalkReducer(failed, { type: "start" });
  expect(next.phase).toBe("listening");
  expect(next.retrying).toBe(true);
});
