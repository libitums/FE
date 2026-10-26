// 세션의 시험 계정 표시를 맞춥니다(ADR-0085). 저장된 세션의 액세스 토큰은 로그인 · 갱신 · 로그아웃으로 바뀌므로 렌더
// 뒤마다 다시 읽고, 바뀌었을 때만 다시 그립니다. 표시는 이 렌더 안에서 바로 모듈 값에 반영합니다 — 아래 화면들이
// 같은 렌더에서 판정하기 때문입니다.

import { useEffect, useState } from "@lynx-js/react";

import { loadAuthSession } from "../lib/auth-session";
import { setTesterAccessActive, testerAccessFrom } from "../lib/tester-access";

function storedAccessToken(): string | null {
  "background only";
  try {
    return loadAuthSession()?.accessToken ?? null;
  } catch {
    return null;
  }
}

export function useTesterAccess(): boolean {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const next = storedAccessToken();
    if (next !== token) setToken(next);
  });
  const active = testerAccessFrom(token);
  setTesterAccessActive(active);
  return active;
}
