// 첫날 무제한 티켓 결선(ADR-0186) — 기기의 시작 시각을 한 번 읽어 `ticketsUnlimited()`의 끝 시각을 맞추고, 머리 칩 · 무제한 모달이
// 그릴 이용권(timed)을 냅니다. 끝나는 순간 다시 그려 칩이 숫자로 돌아오고 레슨이 티켓을 씁니다. 안내 모달은 없습니다.

import { useEffect, useState } from "@lynx-js/react";

import { MAX_TIMER_MS } from "../lib/plan-access";
import { setWelcomeTicketPass } from "../lib/reward-ticket-pass";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import { WELCOME_PASS_MS, welcomePassOf, welcomePassStartedAtMs } from "../lib/welcome-pass";

export function useWelcomePass(
  startedAt: () => number | null = welcomePassStartedAtMs,
): UnlimitedPass | undefined {
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [, setExpired] = useState(0);

  // 저장소는 background에서만 읽습니다. 티켓 결선은 이 훅보다 먼저 렌더에서 읽으므로 모듈 값을 맞춘 뒤 다시 그립니다.
  useEffect(() => {
    const read = startedAt();
    setWelcomeTicketPass(read === null ? 0 : read + WELCOME_PASS_MS);
    setStartedAtMs(read);
    return () => setWelcomeTicketPass(0);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const untilMs = startedAtMs === null ? 0 : startedAtMs + WELCOME_PASS_MS;
  useEffect(() => {
    const left = untilMs - Date.now();
    if (left <= 0) return undefined;
    const handle = setTimeout(() => setExpired((n) => n + 1), Math.min(left + 1000, MAX_TIMER_MS));
    return () => clearTimeout(handle);
  }, [untilMs]);

  return welcomePassOf(startedAtMs, Date.now());
}
