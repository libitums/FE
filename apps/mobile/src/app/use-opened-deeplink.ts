// 받아 둔 Airbridge 딥링크를 탭으로 옮기는 훅입니다(ADR-0080 D3). 누른 알림(`use-opened-push.ts`)과 같은 모양 —
// 호스트는 링크를 **꺼낼 때까지** 들고 있고, 이 훅은 앱 구간(진입 흐름이 끝난 뒤)에서만 꺼냅니다. 그래서 설치 전에 누른
// 링크(지연 딥링크)도 온보딩 · 가입을 끊지 않고 「여정 시작하기」 뒤에 열립니다. 켜진 채 오면 호스트가 전역 이벤트로 알립니다.

import { useCallback, useEffect, useLynxGlobalEventListener, useRef } from "@lynx-js/react";

import { takeOpenedDeeplink } from "../lib/deeplink-host";
import { deeplinkTabFrom } from "./deeplink-target";
import type { Tab } from "./nav-state";

export const deeplinkOpenedEventName = "airbridgeDeeplinkOpened";

export function useOpenedDeeplink(inApp: boolean, openTab: (tab: Tab) => void): void {
  const latest = useRef({ inApp, openTab });
  latest.current = { inApp, openTab };

  const openPending = useCallback((): void => {
    if (!latest.current.inApp) return;
    void takeOpenedDeeplink().then((url) => {
      const tab = deeplinkTabFrom(url);
      if (tab !== null) latest.current.openTab(tab);
    });
  }, []);

  useEffect(() => {
    openPending();
  }, [inApp, openPending]);

  useLynxGlobalEventListener(deeplinkOpenedEventName, openPending);
}
