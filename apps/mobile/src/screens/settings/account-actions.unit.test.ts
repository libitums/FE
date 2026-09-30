import { getDialogContract } from "@libitums/ui-lynx/dialog";
import { describe, expect, test } from "vitest";

import type { AccountDeletionFailure } from "../../lib/account.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import type {
  AccountActionsEvent,
  AccountActionsState,
  AccountActionsTransition,
} from "./account-actions.contract";
import {
  accountActions,
  accountActionsLayerOpen,
  accountActionsTransition,
  accountDeletionFailureMessage,
  accountDialogEventFor,
  deleteDialogActions,
  initialAccountActionsState,
  signOutDialogActions,
} from "./account-actions";

// test-plan §2.5 AX1 ~ AX8. 전이표는 계약 파일(account-actions.contract.ts)의 아홉 줄이다.

const idle = (failure: AccountDeletionFailure | null): AccountActionsState => ({
  kind: "idle",
  failure,
});
const confirmingSignOut: AccountActionsState = { kind: "confirming-sign-out" };
const confirmingDelete: AccountActionsState = { kind: "confirming-delete" };
const deleting: AccountActionsState = { kind: "deleting" };

const failureReasons: readonly AccountDeletionFailure[] = [
  "network",
  "unavailable",
  "unconfigured",
  "session-expired",
  "apple-unconfirmed",
];

const openSignOut: AccountActionsEvent = { type: "open", action: "sign-out" };
const openDelete: AccountActionsEvent = { type: "open", action: "delete-account" };
const dismiss: AccountActionsEvent = { type: "dismiss" };
const confirm: AccountActionsEvent = { type: "confirm" };
const settleDeleted: AccountActionsEvent = { type: "settle", result: { status: "deleted" } };
const settleCancelled: AccountActionsEvent = { type: "settle", result: { status: "cancelled" } };
const settleFailed = (reason: AccountDeletionFailure): AccountActionsEvent => ({
  type: "settle",
  result: { status: "failed", reason },
});

const allStates: readonly AccountActionsState[] = [
  idle(null),
  ...failureReasons.map(idle),
  confirmingSignOut,
  confirmingDelete,
  deleting,
];
const allEvents: readonly AccountActionsEvent[] = [
  openSignOut,
  openDelete,
  dismiss,
  confirm,
  settleDeleted,
  settleCancelled,
  ...failureReasons.map(settleFailed),
];

// 표에 있는 줄만 기대값을 낸다. 없으면 undefined(= 같은 객체 · none이어야 한다).
function tableRow(
  state: AccountActionsState,
  event: AccountActionsEvent,
): AccountActionsTransition | undefined {
  switch (state.kind) {
    case "idle": {
      if (event.type === "open" && event.action === "sign-out") {
        return { state: confirmingSignOut, effect: "none" };
      }
      if (event.type === "open") {
        return { state: confirmingDelete, effect: "none" };
      }
      return undefined;
    }
    case "confirming-sign-out": {
      if (event.type === "dismiss") return { state: idle(null), effect: "none" };
      if (event.type === "confirm") return { state: idle(null), effect: "sign-out" };
      return undefined;
    }
    case "confirming-delete": {
      if (event.type === "dismiss") return { state: idle(null), effect: "none" };
      if (event.type === "confirm") return { state: deleting, effect: "delete-account" };
      return undefined;
    }
    case "deleting": {
      if (event.type !== "settle") return undefined;
      if (event.result.status === "deleted") return { state: deleting, effect: "none" };
      if (event.result.status === "cancelled") return { state: confirmingDelete, effect: "none" };
      return { state: idle(event.result.reason), effect: "none" };
    }
  }
}

describe("accountActions · initialAccountActionsState", () => {
  test("AX1: 행 순서는 sign-out → delete-account, 초기 상태는 idle(null)", () => {
    expect(accountActions).toStrictEqual(["sign-out", "delete-account"]);
    expect(initialAccountActionsState).toStrictEqual({ kind: "idle", failure: null });
  });
});

describe("accountActionsTransition", () => {
  test("AX2: 표의 아홉 줄 — 다음 상태 · 효과가 정확히 같다", () => {
    const rows: [AccountActionsState, AccountActionsEvent, AccountActionsTransition][] = [
      [idle(null), openSignOut, { state: confirmingSignOut, effect: "none" }],
      [idle(null), openDelete, { state: confirmingDelete, effect: "none" }],
      [confirmingSignOut, dismiss, { state: idle(null), effect: "none" }],
      [confirmingSignOut, confirm, { state: idle(null), effect: "sign-out" }],
      [confirmingDelete, dismiss, { state: idle(null), effect: "none" }],
      [confirmingDelete, confirm, { state: deleting, effect: "delete-account" }],
      [deleting, settleDeleted, { state: deleting, effect: "none" }],
      [deleting, settleCancelled, { state: confirmingDelete, effect: "none" }],
      [deleting, settleFailed("network"), { state: idle("network"), effect: "none" }],
    ];
    for (const [state, event, expected] of rows) {
      expect(accountActionsTransition(state, event)).toStrictEqual(expected);
    }
  });

  test.each(failureReasons)("AX2: deleting + settle(failed %s) → idle(%s) · none", (reason) => {
    expect(accountActionsTransition(deleting, settleFailed(reason))).toStrictEqual({
      state: idle(reason),
      effect: "none",
    });
  });

  test.each(failureReasons)(
    "AX2: idle(%s) + open은 실패 문구를 지우고 대화상자를 연다",
    (reason) => {
      expect(accountActionsTransition(idle(reason), openSignOut)).toStrictEqual({
        state: confirmingSignOut,
        effect: "none",
      });
      expect(accountActionsTransition(idle(reason), openDelete)).toStrictEqual({
        state: confirmingDelete,
        effect: "none",
      });
    },
  );

  test("AX3: 표 밖 조합 전부 — 입력과 같은 객체(toBe)이고 효과는 none", () => {
    let outsideTable = 0;
    for (const state of allStates) {
      for (const event of allEvents) {
        if (tableRow(state, event) !== undefined) continue;
        outsideTable += 1;
        const transition = accountActionsTransition(state, event);
        expect(transition.state).toBe(state);
        expect(transition.effect).toBe("none");
      }
    }
    // 표 밖 조합이 실제로 검사됐는지(전수 열거가 비지 않았는지) 확인한다.
    expect(outsideTable).toBeGreaterThan(30);
  });

  test("AX3: 특히 deleting은 open · dismiss · confirm을 모두 무시한다", () => {
    for (const event of [openSignOut, openDelete, dismiss, confirm]) {
      const transition = accountActionsTransition(deleting, event);
      expect(transition.state).toBe(deleting);
      expect(transition.effect).toBe("none");
    }
  });

  test("AX3: idle + confirm · settle, confirming-* + open은 무시한다", () => {
    const idleState = idle("network");
    for (const event of [
      confirm,
      dismiss,
      settleDeleted,
      settleCancelled,
      settleFailed("network"),
    ]) {
      expect(accountActionsTransition(idleState, event).state).toBe(idleState);
    }
    for (const state of [confirmingSignOut, confirmingDelete]) {
      for (const event of [openSignOut, openDelete]) {
        expect(accountActionsTransition(state, event).state).toBe(state);
      }
    }
  });

  test("AX2: 전 조합에서 표 안의 줄은 표대로다(전수 대조)", () => {
    for (const state of allStates) {
      for (const event of allEvents) {
        const expected = tableRow(state, event);
        if (expected === undefined) continue;
        expect(accountActionsTransition(state, event)).toStrictEqual(expected);
      }
    }
  });
});

describe("accountActionsLayerOpen", () => {
  test("AX4: idle은 false, 나머지 셋은 true", () => {
    expect(accountActionsLayerOpen(idle(null))).toBe(false);
    for (const reason of failureReasons) {
      expect(accountActionsLayerOpen(idle(reason))).toBe(false);
    }
    expect(accountActionsLayerOpen(confirmingSignOut)).toBe(true);
    expect(accountActionsLayerOpen(confirmingDelete)).toBe(true);
    expect(accountActionsLayerOpen(deleting)).toBe(true);
  });
});

describe("dialog actions", () => {
  test("AX5: signOutDialogActions — 확인 → 취소, loading · disabled 키 없음", () => {
    expect(signOutDialogActions(uiCopyEn)).toStrictEqual([
      { id: "sign-out", label: "Sign out" },
      { id: "stay", label: "Stay signed in" },
    ]);
  });

  test("AX5: 라벨은 문구표에서 온다", () => {
    expect(signOutDialogActions(markedUiCopy)).toStrictEqual([
      { id: "sign-out", label: "⟦settings.signOutDialog.confirm⟧" },
      { id: "stay", label: "⟦settings.signOutDialog.cancel⟧" },
    ]);
  });

  test("AX6: confirming-delete — 두 액션 모두 평범하다", () => {
    expect(deleteDialogActions({ kind: "confirming-delete" }, uiCopyEn)).toStrictEqual([
      { id: "delete", label: "Delete account" },
      { id: "keep", label: "Keep account" },
    ]);
  });

  test("AX6: deleting — 확인은 loading, 취소는 disabled", () => {
    expect(deleteDialogActions({ kind: "deleting" }, uiCopyEn)).toStrictEqual([
      { id: "delete", label: "Delete account", loading: true },
      { id: "keep", label: "Keep account", disabled: true },
    ]);
  });

  test("AX6: 라벨은 문구표에서 온다", () => {
    expect(
      deleteDialogActions({ kind: "deleting" }, markedUiCopy).map((a) => a.label),
    ).toStrictEqual(["⟦settings.deleteDialog.confirm⟧", "⟦settings.deleteDialog.cancel⟧"]);
  });

  test("AX6: 두 상태의 액션 모두 getDialogContract가 던지지 않고, deleting은 취소 경로가 없다", () => {
    const props = (actions: ReturnType<typeof deleteDialogActions>) => ({
      title: uiCopyEn.settings.deleteDialog.title,
      description: uiCopyEn.settings.deleteDialog.description,
      bindaction: () => undefined,
      actions,
    });
    const confirming = deleteDialogActions({ kind: "confirming-delete" }, uiCopyEn);
    const busy = deleteDialogActions({ kind: "deleting" }, uiCopyEn);

    expect(() => getDialogContract(props(confirming))).not.toThrow();
    expect(() => getDialogContract(props(busy))).not.toThrow();
    expect(getDialogContract(props(confirming)).cancelActionId).toBe("keep");
    expect(getDialogContract(props(busy)).cancelActionId).toBeNull();
  });

  test("AX5: 로그아웃 대화상자도 계약이 받아들인다(취소 = stay)", () => {
    const contract = getDialogContract({
      title: uiCopyEn.settings.signOutDialog.title,
      bindaction: () => undefined,
      actions: signOutDialogActions(uiCopyEn),
    });
    expect(contract.cancelActionId).toBe("stay");
  });
});

describe("accountDeletionFailureMessage", () => {
  test("AX7: network만 따로, 나머지 넷은 other 문구(정확한 영어)", () => {
    expect(accountDeletionFailureMessage("network", uiCopyEn)).toBe(
      "Couldn't delete your account. Check your connection and try again.",
    );
    for (const reason of [
      "unavailable",
      "unconfigured",
      "session-expired",
      "apple-unconfirmed",
    ] as const) {
      expect(accountDeletionFailureMessage(reason, uiCopyEn)).toBe(
        "Couldn't delete your account. Please try again.",
      );
    }
  });

  test("AX7: 문구는 문구표 경로에서 온다", () => {
    expect(accountDeletionFailureMessage("network", markedUiCopy)).toBe(
      "⟦settings.deleteFailure.network⟧",
    );
    for (const reason of [
      "unavailable",
      "unconfigured",
      "session-expired",
      "apple-unconfirmed",
    ] as const) {
      expect(accountDeletionFailureMessage(reason, markedUiCopy)).toBe(
        "⟦settings.deleteFailure.other⟧",
      );
    }
  });
});

describe("accountDialogEventFor", () => {
  test("AX8: sign-out · delete → confirm, stay · keep → dismiss, 모르는 id → null", () => {
    expect(accountDialogEventFor("sign-out")).toStrictEqual({ type: "confirm" });
    expect(accountDialogEventFor("delete")).toStrictEqual({ type: "confirm" });
    expect(accountDialogEventFor("stay")).toStrictEqual({ type: "dismiss" });
    expect(accountDialogEventFor("keep")).toStrictEqual({ type: "dismiss" });
    for (const id of ["", "cancel", "ok", "delete-account", "Delete"]) {
      expect(accountDialogEventFor(id)).toBeNull();
    }
  });
});
