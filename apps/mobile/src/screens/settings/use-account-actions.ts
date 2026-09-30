// 설정 화면 계정 동작의 상태 훅입니다. 전이는 순수 함수(`account-actions.ts`)가 정하고, 이 훅은
// 상태를 쥐고 효과대로 콜백을 한 번 부르며 실패 문구를 낭독하고 겹침 레이어를 알립니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import type { AccountDeletionResult } from "../../lib/account.contract";
import { useScreenLayer } from "../../lib/use-screen-layer";
import { useUiCopy } from "../../lib/ui-copy";
import {
  accountActionsLayerOpen,
  accountActionsTransition,
  accountDeletionFailureMessage,
  accountDialogEventFor,
  initialAccountActionsState,
} from "./account-actions";
import type {
  AccountActionsController,
  AccountActionsEvent,
  AccountActionsState,
  UseAccountActions,
} from "./account-actions.contract";

const unexpectedFailure: AccountDeletionResult = { status: "failed", reason: "unavailable" };

export const useAccountActions: UseAccountActions = (props): AccountActionsController => {
  const copy = useUiCopy();
  const [state, setState] = useState<AccountActionsState>(initialAccountActionsState);
  // 같은 틱의 두 번째 탭이 옛 상태를 보지 않게 최신 상태를 ref로도 쥡니다.
  const stateRef = useRef<AccountActionsState>(initialAccountActionsState);
  // 부모가 다시 그려 콜백이 바뀌어도 늘 최신 것을 부릅니다.
  const propsRef = useRef(props);
  propsRef.current = props;
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const dispatch = (event: AccountActionsEvent): void => {
    "background only";
    const previous = stateRef.current;
    const { state: next, effect } = accountActionsTransition(previous, event);
    if (next !== previous) {
      stateRef.current = next;
      setState(next);
    }
    if (effect === "sign-out") {
      propsRef.current.onSignOut();
    } else if (effect === "delete-account") {
      const settle = (result: AccountDeletionResult): void => {
        dispatch({ type: "settle", result });
      };
      propsRef.current.onDeleteAccount().then(settle, () => {
        settle(unexpectedFailure);
      });
    }
  };

  // 실패 낭독은 대화상자가 닫힌 화면이 반영된 **뒤**에 냅니다 — 같은 갱신에서 보내면 레이아웃 변경
  // 알림이 낭독을 끊습니다(로그인 화면의 실패 낭독과 같은 자리). `state`는 전이마다 새 객체라 같은
  // 실패로 다시 그려져도 재발화하지 않습니다.
  useEffect(() => {
    if (state.kind === "idle" && state.failure !== null) {
      announce(accountDeletionFailureMessage(state.failure, copyRef.current));
    }
  }, [state]);

  useScreenLayer(accountActionsLayerOpen(state), props.onLayerChange);

  return {
    state,
    open: (action) => {
      "background only";
      dispatch({ type: "open", action });
    },
    onDialogAction: (actionId) => {
      "background only";
      const event = accountDialogEventFor(actionId);
      if (event !== null) {
        dispatch(event);
      }
    },
  };
};
