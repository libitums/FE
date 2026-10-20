// 맵을 화면 쪽 스레드(main thread)에서 프레임마다 옮기는 부드러운 스크롤입니다.
//
// 호스트의 `scrollTo({ smooth })`는 길이를 정할 수 없고 짧게 휙 지나갑니다. 백그라운드 스레드에서 프레임마다
// `scrollTo`를 보내면 그 명령이 몰아서 반영돼 기기에서는 여전히 한 번에 넘어갔습니다(2026-10-20 실기). 그래서
// 애니메이션 자체를 main thread에서 `requestAnimationFrame`으로 돌립니다 — 천천히 출발 · 천천히 도착(ease-in-out).

import { runOnMainThread, useMainThreadRef } from "@lynx-js/react";
import type { RefObject } from "@lynx-js/react";
import type { MainThread } from "@lynx-js/types";

export type MapGlider = {
  /** 맵의 `<scroll-view main-thread:ref>`에 붙입니다. */
  readonly scrollRef: RefObject<MainThread.Element>;
  /** `from`에서 `to`로 `durationMs` 동안 옮깁니다. 돌고 있던 이동은 멈춥니다. */
  readonly glide: (from: number, to: number, durationMs: number) => void;
  /** 돌고 있는 이동을 멈춥니다(손댐 · 화면 떠남). */
  readonly stop: () => void;
};

export function useMapGlide(): MapGlider {
  const scrollRef = useMainThreadRef<MainThread.Element>(null);
  // 이동 세대 — 새 이동 · 멈춤이 오면 올라가고, 옛 이동의 다음 프레임은 자기 세대가 아니면 멈춥니다.
  const generation = useMainThreadRef<number>(0);

  const glideOnMain = (from: number, to: number, durationMs: number): void => {
    "main thread";
    const element = scrollRef.current;
    if (element === null || element === undefined) return;
    generation.current = (generation.current ?? 0) + 1;
    const mine = generation.current;
    const start = Date.now();
    const step = (): void => {
      if (generation.current !== mine) return;
      const t = durationMs <= 0 ? 1 : Math.min(1, (Date.now() - start) / durationMs);
      // 천천히 출발해 가운데서 빠르고 천천히 멈춥니다(ease-in-out cubic). 빠르게 출발하는 곡선(ease-out quint)은
      // 첫 0.2초에 거리의 3분의 2를 가 기기에서 「훅 넘어간다」로 보였습니다(2026-10-20 실기 로그).
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const offset = t >= 1 ? to : from + (to - from) * eased;
      element.invoke("scrollTo", { offset, smooth: false }).catch(() => {});
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  };

  const stopOnMain = (): void => {
    "main thread";
    generation.current = (generation.current ?? 0) + 1;
  };

  return {
    scrollRef,
    glide: (from, to, durationMs) => {
      void runOnMainThread(glideOnMain)(from, to, durationMs);
    },
    stop: () => {
      void runOnMainThread(stopOnMain)();
    },
  };
}
