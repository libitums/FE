// Android 시스템 뒤로가기를 앱의 닫기 경로에 잇는 훅입니다(ADR-0043). 호스트가 누름마다 전역 이벤트를 쏘면
// 열린 층 > 화면의 닫기 > `Nav` 기본값 순으로 한 건을 처리하고, 결과를 호스트에 동기로 답합니다.

import { useCallback, useEffect, useLynxGlobalEventListener, useRef } from "@lynx-js/react";

import { backHandlers } from "../lib/back-handler";
import {
  answerSystemBack,
  notifySystemBackReady,
  systemBackEventName,
  systemBackTokenFrom,
} from "../lib/system-back";
import { defaultBackDecision } from "./back-decision";
import type { Nav, NavAction } from "./nav-state";

export function useSystemBack(nav: Nav, dispatch: (action: NavAction) => void): void {
  // 최신 값을 렌더 중에 ref에 두어 리스너를 한 번만 등록합니다(`use-opened-push.ts`와 같은 방식) —
  // 렌더와 effect 사이에 낡은 `nav`로 판정하는 창이 없습니다.
  const latest = useRef({ nav, dispatch });
  latest.current = { nav, dispatch };

  // 리스너가 선 뒤 한 번 호스트에 알립니다.
  useEffect(() => {
    notifySystemBackReady();
  }, []);

  const onSystemBack = useCallback((...args: unknown[]): void => {
    const token = systemBackTokenFrom(args[0]);
    if (token === null) return;
    if (backHandlers.runTop()) {
      answerSystemBack(token, "handled");
      return;
    }
    const decision = defaultBackDecision(latest.current.nav);
    if (decision.kind === "leave") {
      answerSystemBack(token, "leave");
      return;
    }
    for (const action of decision.actions) latest.current.dispatch(action);
    answerSystemBack(token, "handled");
  }, []);

  useLynxGlobalEventListener(systemBackEventName, onSystemBack);
}
