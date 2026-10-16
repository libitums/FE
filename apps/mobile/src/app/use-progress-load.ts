import { useEffect, useRef, useState } from "@lynx-js/react";

import {
  PROGRESS_LOAD_ROW_DELAY_MS,
  initialProgressLoadPhase,
  progressLoadReducer,
} from "./progress-load";
import type {
  ProgressLoadAction,
  ProgressLoadOutcome,
  ProgressLoadPhase,
  ProgressLocalSnapshot,
} from "./progress-load.contract";

/** 진행 불러오기 상태와 로딩 줄 지연 타이머를 소유합니다. 설계: docs/adr/0062-progress-cache-first.md */
export function useProgressLoad(): {
  readonly phase: ProgressLoadPhase;
  readonly start: (local: ProgressLocalSnapshot) => void;
  readonly settle: (outcome: ProgressLoadOutcome) => void;
  readonly requestRetry: () => void;
} {
  const [phase, setPhase] = useState<ProgressLoadPhase>(initialProgressLoadPhase);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 전이는 한 렌더에 하나씩 커밋합니다. 시작과 즉시 실패가 한 렌더로 묶이면 측정 훅이
  // `idle → failed`만 보고 첫 실패를 놓칩니다. 커밋 전에 온 동작은 줄을 세웠다가 다음 커밋 뒤에 적용합니다.
  const latest = useRef<ProgressLoadPhase>(initialProgressLoadPhase);
  const committing = useRef(false);
  const queued = useRef<ProgressLoadAction[]>([]);
  const apply = (action: ProgressLoadAction): void => {
    const next = progressLoadReducer(latest.current, action);
    if (next === latest.current) return;
    latest.current = next;
    committing.current = true;
    setPhase(next);
  };
  const dispatch = (action: ProgressLoadAction): void => {
    if (committing.current) queued.current.push(action);
    else apply(action);
  };
  useEffect(() => {
    committing.current = false;
    while (!committing.current && queued.current.length > 0) {
      const action = queued.current.shift();
      if (action !== undefined) apply(action);
    }
  }, [phase]);
  // 앞 계정의 타이머가 새 계정의 확인 중을 앞당기지 않게 시작 · 결과 · 언마운트마다 지웁니다.
  const clearTimer = (): void => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  return {
    phase,
    start: (local) => {
      clearTimer();
      dispatch({ type: "started", local });
      if (local === "none") {
        timer.current = setTimeout(() => {
          timer.current = undefined;
          dispatch({ type: "delayElapsed" });
        }, PROGRESS_LOAD_ROW_DELAY_MS);
      }
    },
    settle: (outcome) => {
      clearTimer();
      dispatch({ type: "settled", outcome });
    },
    requestRetry: () => dispatch({ type: "retryRequested" }),
  };
}
