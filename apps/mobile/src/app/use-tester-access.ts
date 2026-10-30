// 세션의 시험 계정 표시를 맞춥니다(ADR-0085). 저장된 세션의 액세스 토큰은 로그인 · 갱신 · 로그아웃으로 바뀌므로 렌더
// 뒤마다 다시 읽고, 바뀌었을 때만 다시 그립니다. 표시는 이 렌더 안에서 바로 모듈 값에 반영합니다 — 아래 화면들이
// 같은 렌더에서 판정하기 때문입니다. 표시가 바뀌면 PostHog · Airbridge 추적도 맞춥니다(ADR-0085 D4).

import { useEffect, useState } from "@lynx-js/react";

import type { AnalyticsUser } from "../lib/analytics-user.contract";
import { loadAuthSession } from "../lib/auth-session";
import { setTesterAccessActive, testerAccessFrom } from "../lib/tester-access";
import { createTesterTrackingSync } from "../lib/tester-tracking";

const syncTesterTracking = createTesterTrackingSync();

function storedAccessToken(): string | null {
  "background only";
  try {
    return loadAuthSession()?.accessToken ?? null;
  } catch {
    return null;
  }
}

export function useTesterAccess(analyticsUser: AnalyticsUser | null): boolean {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const next = storedAccessToken();
    // 저장소를 읽은 뒤에만 맞춥니다 — 첫 렌더의 null로 멈춘 호스트를 잠깐 켜지 않게 합니다.
    syncTesterTracking(testerAccessFrom(next), analyticsUser);
    if (next !== token) setToken(next);
  });
  const active = testerAccessFrom(token);
  setTesterAccessActive(active);
  return active;
}
