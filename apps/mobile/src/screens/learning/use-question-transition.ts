import { useEffect, useRef, useState } from "@lynx-js/react";
import type { Motion } from "@libitums/ui-lynx/motion";

import {
  initialQuestionTransitionPhase,
  questionTransitionDurationMs,
  questionTransitionKey,
  questionTransitionReducer,
  type QuestionTransitionPhase,
} from "./question-transition";

/**
 * 문항이 바뀔 때의 전환 상태를 돌립니다. 키가 바뀐 렌더에서 change를 먹이고,
 * primed는 다음 틱에 entering으로, entering은 전환 시간 뒤 idle로 옮깁니다.
 * 넘김 자물쇠 · 타이머 · 다른 상태에는 닿지 않으며 던지지 않습니다.
 */
export function useQuestionTransition(
  questionIndex: number,
  complete: boolean,
  motion: Motion,
): QuestionTransitionPhase {
  const [phase, setPhase] = useState<QuestionTransitionPhase>(() =>
    initialQuestionTransitionPhase(questionIndex),
  );
  const key = questionTransitionKey(questionIndex, complete);
  const previousKey = useRef(key);

  if (previousKey.current !== key) {
    previousKey.current = key;
    setPhase(questionTransitionReducer(phase, "change"));
  }

  useEffect(() => {
    if (phase === "primed") {
      const timer = setTimeout(() => {
        setPhase((current) => questionTransitionReducer(current, "tick"));
      }, 0);
      return () => clearTimeout(timer);
    }
    if (phase === "entering") {
      const timer = setTimeout(() => {
        setPhase((current) => questionTransitionReducer(current, "end"));
      }, questionTransitionDurationMs(motion));
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, motion]);

  return phase;
}
