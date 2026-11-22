// 대기 말풍선의 단계 훅(ADR-0146 추가) — 판정은 `media-pending-stage.ts`(순수), 여기는 타이머입니다.

import { useEffect, useState } from "@lynx-js/react";

import { nextStageDelay, stageAt } from "./media-pending-stage";

/** 기다린 시간 — 기기 시계가 뒤로 가도(시작 시각이 앞날) 0에서 멈춰, 다음 단계가 그만큼 늦어지지 않습니다. */
const elapsedSince = (start: number): number => Math.max(0, Date.now() - start);

/**
 * 대기 문구의 단계 — 기다린 시간으로 넘어가고 마지막 단계에서 멈춥니다. 타이머가 조금 일찍 불려도 멈추지 않게 한 단계는 꼭 넘깁니다.
 * `startedAt`은 대기 줄이 실은 기기 시계의 시작 시각입니다 — 없으면 말풍선이 선 때. 선 채로 바뀌면(새 요청) 그 시각으로 다시 셉니다.
 */
export function usePendingStage(marks: readonly number[], startedAt: number | undefined): number {
  const [mountedAt] = useState(Date.now);
  const start = startedAt ?? mountedAt;
  const [state, setState] = useState(() => ({ start, stage: stageAt(marks, elapsedSince(start)) }));
  // 시작 시각이 바뀌면 이 렌더에서 곧바로 다시 계산합니다 — 옛 단계가 한 프레임도 비치지 않게.
  const current =
    state.start === start ? state : { start, stage: stageAt(marks, elapsedSince(start)) };
  if (current !== state) setState(current);
  const stage = current.stage;
  useEffect(() => {
    const wait = nextStageDelay(marks, stage, elapsedSince(start));
    if (wait === null) return undefined;
    const timer = setTimeout(() => {
      setState((previous) =>
        previous.start !== start
          ? previous
          : {
              start,
              stage: Math.min(
                marks.length - 1,
                Math.max(previous.stage + 1, stageAt(marks, elapsedSince(start))),
              ),
            },
      );
    }, wait);
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android).
    return () => {
      clearTimeout(timer);
    };
  }, [marks, stage, start]);
  return stage;
}
