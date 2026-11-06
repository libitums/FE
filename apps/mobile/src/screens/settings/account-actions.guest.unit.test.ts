import { describe, expect, test } from "vitest";

import {
  accountActions,
  accountActionsFor,
  accountActionsTransition,
  initialAccountActionsState,
} from "./account-actions";
import type { AccountActionsEvent, AccountActionsState } from "./account-actions.contract";

// test-plan AX5 — 비회원 「로그인」 행(ADR-0111). 표 밖 조합은 AX3 전수(account-actions.unit.test.ts)가 함께 본다.

const openSignIn: AccountActionsEvent = { type: "open", action: "sign-in" };

describe("accountActionsFor", () => {
  test("AX5: guest는 [sign-in], signed-in은 지금의 accountActions(sign-out → delete-account)다", () => {
    expect(accountActionsFor("guest")).toStrictEqual(["sign-in"]);
    expect(accountActionsFor("signed-in")).toStrictEqual(accountActions);
    expect(accountActionsFor("signed-in")).toStrictEqual(["sign-out", "delete-account"]);
  });
});

describe("open(sign-in) 전이", () => {
  test("AX5: idle(null) + open(sign-in) → 초기 상태와 같은 idle(null) · 효과 sign-in(대화상자 없음)", () => {
    const transition = accountActionsTransition(initialAccountActionsState, openSignIn);

    expect(transition.state).toStrictEqual(initialAccountActionsState);
    expect(transition.effect).toBe("sign-in");
  });

  test("AX5: confirming-* · deleting에서 open(sign-in)은 같은 객체 · none이다", () => {
    const states: readonly AccountActionsState[] = [
      { kind: "confirming-sign-out" },
      { kind: "confirming-delete" },
      { kind: "deleting" },
    ];
    for (const state of states) {
      const transition = accountActionsTransition(state, openSignIn);

      expect(transition.state).toBe(state);
      expect(transition.effect).toBe("none");
    }
  });
});
