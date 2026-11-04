import { afterEach, describe, expect, test } from "vitest";

import { forgetMapCleared, rememberMapCleared, takeMapCleared } from "./journey-map-cleared-memory";

// `unit` 계층: 방금 끝낸 유닛의 기억 — 적고, 한 번 읽으면 비고, 지울 수 있다.

afterEach(() => {
  forgetMapCleared();
});

describe("journey-map-cleared-memory", () => {
  test("CM1. 처음은 null이고, 기억한 뒤 한 번 읽으면 값이며 둘째 읽기는 null", () => {
    expect(takeMapCleared()).toBeNull();
    rememberMapCleared("u01-water", "S1");
    expect(takeMapCleared()).toEqual({ episodeId: "u01-water", unitKey: "S1" });
    expect(takeMapCleared()).toBeNull();
  });

  test("CM1. 나중 기억이 앞 기억을 덮고, forget은 비운다", () => {
    rememberMapCleared("u01-water", "S1");
    rememberMapCleared("u02-checkin", "intro");
    expect(takeMapCleared()).toEqual({ episodeId: "u02-checkin", unitKey: "intro" });
    rememberMapCleared("u01-water", "S2");
    forgetMapCleared();
    expect(takeMapCleared()).toBeNull();
  });
});
