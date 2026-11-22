// 대기 말풍선의 단계 훅(ADR-0146 추가) — 판정은 `media-pending-stage.ts`(순수), 여기는 타이머입니다.

import { useEffect, useState } from "@lynx-js/react";

import { nextStageDelay, stageAt } from "./media-pending-stage";

/**
 * 대기 문구의 단계 — 기다린 시간으로 넘어가고 마지막 단계에서 멈춥니다.
 * `startedAt`은 대기 줄이 실은 기기 시계의 시작 시각입니다(없으면 말풍선이 선 때). 말풍선이 설 때 「이미 기다린 시간」을 한 번 정하고
 * (시계가 뒤로 가 시작 시각이 앞날이면 0), 그 뒤로는 선 때부터 흐른 시간을 더합니다 — 시계가 어긋나도 늦어지는 것이 쌓이지 않습니다.
 * 시작 시각이 바뀌는 새 요청은 부르는 쪽이 `key`로 말풍선을 다시 세웁니다.
 */
export function usePendingStage(marks: readonly number[], startedAt: number | undefined): number {
  const [mountedAt] = useState(Date.now);
  const [waited] = useState(() => Math.max(0, mountedAt - (startedAt ?? mountedAt)));
  // 타이머가 불릴 때마다 다시 그려 단계를 새로 잽니다(조금 일찍 불려도 다음 타이머가 남은 만큼 다시 걸립니다).
  const [tick, setTick] = useState(0);
  const elapsed = waited + Math.max(0, Date.now() - mountedAt);
  const stage = stageAt(marks, elapsed);
  useEffect(() => {
    const wait = nextStageDelay(marks, stage, waited + Math.max(0, Date.now() - mountedAt));
    if (wait === null) return undefined;
    const timer = setTimeout(() => setTick((count) => count + 1), Math.max(wait, 1));
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android).
    return () => {
      clearTimeout(timer);
    };
  }, [marks, stage, tick, waited, mountedAt]);
  return stage;
}
