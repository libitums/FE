// 대기 말풍선의 단계 훅(ADR-0146 추가) — 판정은 `media-pending-stage.ts`(순수), 여기는 타이머입니다.

import { useEffect, useState } from "@lynx-js/react";

import { elapsedStep, nextStageDelay, stageAt } from "./media-pending-stage";

type Clock = { readonly elapsed: number; readonly at: number };

/**
 * 대기 문구의 단계 — 기다린 시간으로 넘어가고 마지막 단계에서 멈춥니다.
 * `startedAt`은 대기 줄이 실은 기기 시계의 시작 시각입니다(없으면 말풍선이 선 때). 말풍선이 설 때 「이미 기다린 시간」을 한 번 정하고
 * (시작 시각이 앞날이면 0), 그 뒤로는 타이머가 불릴 때마다 흐른 시간을 더합니다 — 기다리는 중에 시계가 뒤로 가도 멈추지 않고,
 * 늦어지는 것이 쌓이지 않습니다. 렌더에서는 시계를 읽지 않습니다. 시작 시각이 바뀌는 새 요청은 부르는 쪽이 `key`로 다시 세웁니다.
 */
export function usePendingStage(marks: readonly number[], startedAt: number | undefined): number {
  const [clock, setClock] = useState<Clock>(() => {
    const at = Date.now();
    return { elapsed: Math.max(0, at - (startedAt ?? at)), at };
  });
  const stage = stageAt(marks, clock.elapsed);
  useEffect(() => {
    const wait = nextStageDelay(marks, stage, clock.elapsed);
    if (wait === null) return undefined;
    // 조금 일찍 불려도 남은 만큼 다시 겁니다(시계가 바뀔 때마다 이 효과가 다시 돕니다).
    const waited = Math.max(wait, 1);
    const timer = setTimeout(() => {
      const at = Date.now();
      setClock((previous) => ({
        elapsed: previous.elapsed + elapsedStep(at - previous.at, waited),
        at,
      }));
    }, waited);
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android).
    return () => {
      clearTimeout(timer);
    };
  }, [marks, stage, clock]);
  return stage;
}
