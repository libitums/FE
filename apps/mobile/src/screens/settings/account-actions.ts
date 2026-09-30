// 설정 화면 계정 동작의 순수 부분입니다 — 전이표 · 대화상자 액션 · 문구 선택 · id → 사건.
// 어휘는 `account-actions.contract.ts`입니다. 상태를 쥐는 훅은 `use-account-actions.ts`입니다.

import type {
  AccountAction,
  AccountActionsLayerOpen,
  AccountActionsState,
  AccountActionsTransition,
  AccountActionsTransitionFn,
  AccountDeletionFailureMessage,
  AccountDialogEventFor,
  DeleteDialogActions,
  SignOutDialogActions,
} from "./account-actions.contract";

/** 묶음의 행 순서이자 표시 순서입니다. */
export const accountActions: readonly AccountAction[] = ["sign-out", "delete-account"];

export const initialAccountActionsState: AccountActionsState = { kind: "idle", failure: null };

const idle: AccountActionsState = initialAccountActionsState;

export const accountActionsTransition: AccountActionsTransitionFn = (state, event) => {
  const unchanged: AccountActionsTransition = { state, effect: "none" };
  switch (state.kind) {
    case "idle": {
      if (event.type !== "open") {
        return unchanged;
      }
      return {
        state:
          event.action === "sign-out"
            ? { kind: "confirming-sign-out" }
            : { kind: "confirming-delete" },
        effect: "none",
      };
    }
    case "confirming-sign-out": {
      if (event.type === "dismiss") {
        return { state: idle, effect: "none" };
      }
      return event.type === "confirm" ? { state: idle, effect: "sign-out" } : unchanged;
    }
    case "confirming-delete": {
      if (event.type === "dismiss") {
        return { state: idle, effect: "none" };
      }
      return event.type === "confirm"
        ? { state: { kind: "deleting" }, effect: "delete-account" }
        : unchanged;
    }
    case "deleting": {
      if (event.type !== "settle") {
        return unchanged;
      }
      switch (event.result.status) {
        case "deleted": {
          return unchanged;
        }
        case "cancelled": {
          return { state: { kind: "confirming-delete" }, effect: "none" };
        }
        case "failed": {
          return { state: { kind: "idle", failure: event.result.reason }, effect: "none" };
        }
      }
    }
  }
};

export const accountActionsLayerOpen: AccountActionsLayerOpen = (state) => state.kind !== "idle";

export const signOutDialogActions: SignOutDialogActions = (copy) => [
  { id: "sign-out", label: copy.settings.signOutDialog.confirm },
  { id: "stay", label: copy.settings.signOutDialog.cancel },
];

export const deleteDialogActions: DeleteDialogActions = (state, copy) => {
  const confirm = copy.settings.deleteDialog.confirm;
  const cancel = copy.settings.deleteDialog.cancel;
  if (state.kind === "deleting") {
    return [
      { id: "delete", label: confirm, loading: true },
      { id: "keep", label: cancel, disabled: true },
    ];
  }
  return [
    { id: "delete", label: confirm },
    { id: "keep", label: cancel },
  ];
};

export const accountDeletionFailureMessage: AccountDeletionFailureMessage = (reason, copy) =>
  reason === "network" ? copy.settings.deleteFailure.network : copy.settings.deleteFailure.other;

export const accountDialogEventFor: AccountDialogEventFor = (actionId) => {
  switch (actionId) {
    case "sign-out":
    case "delete": {
      return { type: "confirm" };
    }
    case "stay":
    case "keep": {
      return { type: "dismiss" };
    }
    default: {
      return null;
    }
  }
};
