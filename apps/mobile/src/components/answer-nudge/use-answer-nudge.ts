import { useEffect, useState } from "@lynx-js/react";

import { ANSWER_NUDGE_DELAY_MS } from "./answer-nudge";

/**
 * 고민 힌트로 가리킬 조각(ADR-0177). `next`는 지금 놓을 다음 정답 조각(없으면 null — 채점 뒤 · 틀린 조각이 놓임 · 잠시 멈춤),
 * `key`는 「지금 화면의 상태」(문항 + 놓인 조각)입니다. 상태가 바뀌거나 가리킬 조각이 없어지면 꺼지고, 다시 생기면 시간을 처음부터
 * 셉니다 — 같은 상태로 돌아와도 곧바로 켜지지 않습니다. 켜지기 전에는 null을 냅니다.
 */
export function useAnswerNudge(key: string, next: number | null): number | null {
  const [shownFor, setShownFor] = useState<string | null>(null);
  const enabled = next !== null;
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => setShownFor(key), ANSWER_NUDGE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setShownFor(null);
    };
  }, [key, enabled]);
  return enabled && shownFor === key ? next : null;
}
