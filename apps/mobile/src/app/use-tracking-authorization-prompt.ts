// 추적 허용(ATT)을 묻는 때를 정하는 훅입니다(ADR-0079 D2 — 사용자 결정 2026-10-22). **가입을 마친 뒤 여정 맵에
// 처음 들어선 순간** 호스트에 한 번 요청합니다. 진입 흐름(온보딩 · 로그인 · 프로필 · 언어 선택) 중에는 묻지 않습니다.
// 한 세션(`AppSession`)에 한 번이고, 이미 정했으면 시스템이 다시 묻지 않으므로 호스트가 아무것도 띄우지 않습니다.

import { useEffect, useRef } from "@lynx-js/react";

import { requestTrackingAuthorization } from "../lib/tracking-authorization";

export function useTrackingAuthorizationPrompt(onJourneyMap: boolean): void {
  const asked = useRef(false);
  useEffect(() => {
    if (!onJourneyMap || asked.current) return;
    asked.current = true;
    requestTrackingAuthorization();
  }, [onJourneyMap]);
}
