// 테스트 지원 — 가짜 출처 unit 테스트가 함께 쓰는 주입 타이머입니다. 제품 코드는 이 파일을 import하지 않습니다.
// 실제 시간은 흐르지 않고 `advance(ms)` 만큼만 걸어 둔 콜백이 시각 순으로 실행됩니다.

import type { ChatTimers } from "./chat-source.contract";

export type FakeTimers = ChatTimers & {
  advance(ms: number): void;
  pending(): number;
};

export function fakeTimers(): FakeTimers {
  let clock = 0;
  let nextId = 1;
  const queue = new Map<number, { at: number; fn: () => void }>();
  return {
    setTimeout(fn, ms) {
      const id = nextId++;
      queue.set(id, { at: clock + ms, fn });
      return id;
    },
    clearTimeout(handle) {
      queue.delete(handle as number);
    },
    advance(ms) {
      const target = clock + ms;
      for (;;) {
        const due = [...queue.entries()]
          .filter(([, entry]) => entry.at <= target)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (due === undefined) break;
        queue.delete(due[0]);
        clock = due[1].at;
        due[1].fn();
      }
      clock = target;
    },
    pending: () => queue.size,
  };
}
