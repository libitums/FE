// 대기 말풍선의 단계 훅(ADR-0146 추가) — 판정은 `media-pending-stage.ts`(순수), 여기는 기억 · 타이머입니다.

import { useEffect, useState } from "@lynx-js/react";

import {
  createPendingClock,
  nextStageDelay,
  pendingEnded,
  pendingStartOf,
  stageAt,
} from "./media-pending-stage";

// 대기 말풍선이 처음 선 때의 기억 — 화면이 다시 그려져도 남게 모듈에 둡니다(기기 시계, `media-pending-stage.ts`).
let pendingClock = createPendingClock();

/** 테스트 사이에 기억을 비웁니다. */
export function resetPendingClockForTests(): void {
  pendingClock = createPendingClock();
}

/**
 * 대기 문구의 단계 — 기다린 시간으로 넘어가고 마지막 단계에서 멈춥니다(`media-pending-stage.ts`). 타이머가 조금 일찍 불려도
 * 멈추지 않게 한 단계는 꼭 넘깁니다. 시작 시각은 말풍선이 처음 선 때(기기 시계)로 한 번만 정합니다.
 */
export function usePendingStage(
  marks: readonly number[],
  id: string | undefined,
  group: string | undefined,
): number {
  const [start] = useState(() => pendingStartOf(pendingClock, id, group, Date.now()));
  const [stage, setStage] = useState(() => stageAt(marks, Date.now() - start));
  useEffect(() => {
    const wait = nextStageDelay(marks, stage, Date.now() - start);
    if (wait === null) return undefined;
    const timer = setTimeout(() => {
      setStage((current) =>
        Math.min(marks.length - 1, Math.max(current + 1, stageAt(marks, Date.now() - start))),
      );
    }, wait);
    return () => {
      clearTimeout(timer);
    };
  }, [marks, stage, start]);
  useEffect(
    () => () => {
      pendingEnded(pendingClock, group, Date.now());
    },
    [group],
  );
  return stage;
}
