import { expect, test } from "vitest";

import { initialRoleplayTalkState, roleplayTalkReducer } from "./roleplay-story";
import type { RoleplayTalkState } from "./roleplay-story.contract";

// `unit` 계층: 롤플레이 한 턴에서 못 알아들음(missed)이 판정 없이 같은 턴을 다시 듣게 하는 전이입니다(ADR-0179).

const stateOf = (overrides: Partial<RoleplayTalkState>): RoleplayTalkState => ({
  ...initialRoleplayTalkState,
  ...overrides,
});

test("[RS-M1] 듣는 중에 온 missed는 missed 국면과 까닭이 되고 판정 · 결과는 없다", () => {
  const next = roleplayTalkReducer(stateOf({ phase: "listening" }), {
    type: "missed",
    reason: "no-match",
  });
  expect(next.phase).toBe("missed");
  expect(next.missedReason).toBe("no-match");
  expect(next.verdict).toBeNull();
  expect(next.results).toEqual([]);
});

test("[RS-M2] 듣는 중이 아닐 때 온 missed는 같은 참조다(늦게 온 결과)", () => {
  for (const phase of ["ready", "heard", "unavailable"] as const) {
    const state = stateOf({ phase });
    expect(roleplayTalkReducer(state, { type: "missed", reason: "no-match" })).toBe(state);
  }
});

test("[RS-M3] missed에서 start는 같은 턴을 다시 듣고 까닭을 지운다", () => {
  const next = roleplayTalkReducer(
    stateOf({ phase: "missed", missedReason: "network", turnIndex: 1 }),
    { type: "start" },
  );
  expect(next.phase).toBe("listening");
  expect(next.missedReason).toBeNull();
  expect(next.turnIndex).toBe(1);
});

test("[RS-M4] missed에서 Skip은 판정 없이 넘기고 건너뜀 수 +1이다", () => {
  const next = roleplayTalkReducer(stateOf({ phase: "missed", missedReason: "no-match" }), {
    type: "skip",
  });
  expect(next.turnIndex).toBe(1);
  expect(next.skippedCount).toBe(1);
  expect(next.results).toEqual([]);
  expect(next.missedReason).toBeNull();
});

test("[RS-M5] missed에서 다시 시작하면 retrying이 서고, 처음 시작 · 다음 턴에는 서지 않는다", () => {
  const retried = roleplayTalkReducer(stateOf({ phase: "missed", missedReason: "no-match" }), {
    type: "start",
  });
  expect(retried.retrying).toBe(true);
  expect(roleplayTalkReducer(stateOf({ phase: "ready" }), { type: "start" }).retrying).toBe(false);
  const skipped = roleplayTalkReducer({ ...retried, phase: "missed" }, { type: "skip" });
  expect(skipped.retrying).toBe(false);
});
