import { beforeEach, describe, expect, test } from "vitest";

import {
  PREFETCH_WINDOW_AHEAD,
  openEpisodeForPrefetch,
  prefetchWindowIds,
  prefetchWindowOf,
  resetPrefetchWindowForTests,
  setPrefetchWindow,
} from "./prefetch-window";

// `unit` 계층(PW1 ~ PW6, ADR-0157): 배경 미리 받기 창 = 진행 중인 편 + 다음 `PREFETCH_WINDOW_AHEAD`편.

const ORDER = ["u00-tutorial", "u01-a", "u02-b", "u03-c", "u04-d"];
const done = (ids: readonly string[]) => (id: string) => ids.includes(id);

beforeEach(() => resetPrefetchWindowForTests());

describe("prefetchWindowIds", () => {
  test("[PW1] 창 크기 상수는 1 — 진행 중인 편 + 다음 1편", () => {
    expect(PREFETCH_WINDOW_AHEAD).toBe(1);
  });

  test("[PW2] 새 사용자: 맵 순서 첫 편과 다음 편", () => {
    expect(prefetchWindowIds(ORDER, done([]))).toEqual(["u00-tutorial", "u01-a"]);
  });

  test("[PW3] 중간 사용자: 첫 미완료 편부터 — 앞 편을 끝내면 창이 한 칸 밀린다", () => {
    expect(prefetchWindowIds(ORDER, done(["u00-tutorial", "u01-a"]))).toEqual(["u02-b", "u03-c"]);
  });

  test("[PW4] 건너뛰어 끝낸 편은 창을 밀지 않는다(첫 미완료 기준)", () => {
    expect(prefetchWindowIds(ORDER, done(["u00-tutorial", "u02-b"]))).toEqual(["u01-a", "u02-b"]);
  });

  test("[PW5] 모두 끝냈으면 마지막 편, 편이 창보다 적으면 있는 만큼, 비면 빈 목록", () => {
    expect(prefetchWindowIds(ORDER, done(ORDER))).toEqual(["u04-d"]);
    expect(prefetchWindowIds(["u00-tutorial"], done([]))).toEqual(["u00-tutorial"]);
    expect(prefetchWindowIds([], done([]))).toEqual([]);
    expect(prefetchWindowIds(ORDER, done([]), 2)).toEqual(["u00-tutorial", "u01-a", "u02-b"]);
  });
});

describe("창 저장(세션)", () => {
  test("[PW6] 정하기 전엔 기본 순서의 앞 편, 정하면 그 창 + 이번 실행에 연 편; 같은 창이면 바뀌지 않았다고 알린다", () => {
    expect([...prefetchWindowOf(ORDER)]).toEqual(["u00-tutorial", "u01-a"]);
    expect(setPrefetchWindow(["u02-b", "u03-c"])).toBe(true);
    expect(setPrefetchWindow(["u02-b", "u03-c"])).toBe(false);
    expect([...prefetchWindowOf(ORDER)].sort()).toEqual(["u02-b", "u03-c"]);
    expect(openEpisodeForPrefetch("u04-d")).toBe(true);
    expect(openEpisodeForPrefetch("u04-d")).toBe(false);
    expect(prefetchWindowOf(ORDER).has("u04-d")).toBe(true);
    expect(openEpisodeForPrefetch("u02-b")).toBe(false);
  });
});
