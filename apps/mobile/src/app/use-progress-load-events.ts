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
  // 전이가 일어난 렌더의 sink를 씁니다 — sink가 바뀌어도 이펙트를 다시 돌리지 않습니다.
  const latestSink = useRef(sink);
  latestSink.current = sink;
  useEffect(() => {
    const before = previous.current;
    previous.current = phase;
    const current = latestSink.current;
    if (current === null) return;
    const event = progressLoadEventFor(before, phase);
    if (event === null) return;
    try {
      current(event);
    } catch {
      // 측정 실패는 화면을 막지 않습니다.
    }
  }, [phase]);
}
