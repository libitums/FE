// 스토리 줄에 보인 값을 기억에 남깁니다(`story-row-memory.ts`) — 다음 마운트(탭 재진입)가 첫 프레임에 그립니다. 아직 없음(null)은 남기지 않습니다.

import { useEffect } from "@lynx-js/react";

import type { LastShown } from "./story-row-memory";

export function useKeepShown<T>(memory: LastShown<T> | undefined, value: T | null): void {
  useEffect(() => {
    if (memory !== undefined && value !== null) memory.keep(value);
  }, [memory, value]);
}
