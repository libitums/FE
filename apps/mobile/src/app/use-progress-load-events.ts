import { useEffect, useRef } from "@lynx-js/react";

import type { ProgressLoadEvent } from "../lib/progress-load-event.contract";
import { progressLoadEventFor } from "./progress-load";
import type { ProgressLoadPhase } from "./progress-load.contract";

/** 상태가 바뀔 때 전이마다 측정 이벤트를 한 번 냅니다. 설계: docs/adr/0062-progress-cache-first.md */
export function useProgressLoadEvents(
  phase: ProgressLoadPhase,
  sink: ((event: ProgressLoadEvent) => void) | null,
): void {
  const previous = useRef(phase);
  useEffect(() => {
    const before = previous.current;
    previous.current = phase;
    if (sink === null) return;
    const event = progressLoadEventFor(before, phase);
    if (event === null) return;
    try {
      sink(event);
    } catch {
      // 측정 실패는 화면을 막지 않습니다.
    }
  }, [phase]);
}
