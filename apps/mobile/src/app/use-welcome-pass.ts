// 첫날 무제한 티켓 결선 — 회원만(ADR-0186 개정 1). 저장된 세션의 계정 생성 시각을 읽어 `ticketsUnlimited()`의 끝 시각을 맞추고,
// 머리 칩 · 무제한 모달이 그릴 이용권(timed)을 냅니다. 세션은 로그인 · 갱신 · 로그아웃으로 바뀌므로 렌더 뒤마다 다시 읽고
// 바뀌었을 때만 다시 그립니다(`use-tester-access`와 같은 꼴). 끝나는 순간 다시 그려 칩이 숫자로 돌아옵니다. 안내 모달은 없습니다.

import { useEffect, useState } from "@lynx-js/react";

import { loadAuthSession } from "../lib/auth-session";
import { MAX_TIMER_MS } from "../lib/plan-access";
import { setWelcomeTicketPass } from "../lib/reward-ticket-pass";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import { WELCOME_PASS_MS, welcomePassOf, welcomePassStartOf } from "../lib/welcome-pass";

function storedWelcomePassStart(): number | null {
  "background only";
  try {
    return welcomePassStartOf(loadAuthSession());
  } catch {
    return null;
  }
}

export function useWelcomePass(
  startedAt: () => number | null = storedWelcomePassStart,
): UnlimitedPass | undefined {
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [, setExpired] = useState(0);

  // 저장소는 background에서만 읽습니다. 티켓 결선은 이 훅보다 먼저 렌더에서 읽으므로 모듈 값을 맞춘 뒤 다시 그립니다.
  useEffect(() => {
    const read = startedAt();
    setWelcomeTicketPass(read === null ? 0 : read + WELCOME_PASS_MS);
    if (read !== startedAtMs) setStartedAtMs(read);
  });
  useEffect(() => () => setWelcomeTicketPass(0), []);

  const untilMs = startedAtMs === null ? 0 : startedAtMs + WELCOME_PASS_MS;
  useEffect(() => {
    const left = untilMs - Date.now();
    if (left <= 0) return undefined;
    const handle = setTimeout(() => setExpired((n) => n + 1), Math.min(left + 1000, MAX_TIMER_MS));
    return () => clearTimeout(handle);
  }, [untilMs]);

  return welcomePassOf(startedAtMs, Date.now());
}
