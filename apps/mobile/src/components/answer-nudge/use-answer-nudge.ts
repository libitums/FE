import { useEffect, useState } from "@lynx-js/react";

import { ANSWER_NUDGE_DELAY_MS } from "./answer-nudge";

/**
 * 고민 힌트를 켤 때인가(ADR-0177). `key`는 「지금 화면의 상태」(문항 + 놓인 조각) — 바뀌면 시간을 처음부터 다시 셉니다. 켤 수 없는
 * 때(`enabled` 거짓 — 채점 뒤 · 안내가 떠 있음 · 가리킬 조각 없음)에는 세지 않습니다.
 */
export function useAnswerNudge(key: string, enabled: boolean): boolean {
  const [shownFor, setShownFor] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => setShownFor(key), ANSWER_NUDGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, enabled]);
  return enabled && shownFor === key;
}
