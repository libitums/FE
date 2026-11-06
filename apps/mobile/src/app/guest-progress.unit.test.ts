import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  adoptGuestRecords,
  guestProgressId,
  learningStreakOf,
  mergedPendingDays,
  mergedPendingProgress,
  previousLocalDay,
} from "./guest-progress";
import {
  emptyJourneyProgress,
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

// 비회원 진행 · 학습일의 순수 함수와 이관(ADR-0111 §1-3). 연속 규칙은 서버 `learning_streak`(ADR-0035)와 같아야 한다.

const today = "2026-11-06";

const guestState: JourneyProgressState = {
  ...emptyJourneyProgress,
  catalogProgress: { "ep-1": ["u00", "u01"] },
};
const userState: JourneyProgressState = {
  ...emptyJourneyProgress,
  catalogProgress: { "ep-1": ["u01"], "ep-2": ["u00"] },
};

const guestProgressKey = "libitum.progress.pending.guest";
const guestDaysKey = "libitum.learning-days.pending.guest";
const userProgressKey = "libitum.progress.pending.u1";
const userDaysKey = "libitum.learning-days.pending.u1";
const guestProfileKey = "libitum.learner-profile.guest";

// 저장소에 적히는 모양(스냅숏) 그대로 돌려 읽은 값입니다 — 합친 결과를 같은 길로 비교합니다.
function roundTripped(state: JourneyProgressState): JourneyProgressState | null {
  return journeyProgressFrom(learningProgressSnapshotFrom(state));
}

function snapshotJson(state: JourneyProgressState): string {
  return JSON.stringify(learningProgressSnapshotFrom(state));
}

describe("previousLocalDay", () => {
  test("GP1. 월말 · 윤년 · 연말을 넘어 하루 전을 낸다", () => {
    expect(previousLocalDay("2026-11-06")).toBe("2026-11-05");
    expect(previousLocalDay("2026-03-01")).toBe("2026-02-28");
    expect(previousLocalDay("2024-03-01")).toBe("2024-02-29");
    expect(previousLocalDay("2026-01-01")).toBe("2025-12-31");
  });
});

describe("learningStreakOf", () => {
  test("GP2. 오늘을 포함해 이어진 날 수를 센다", () => {
    expect(learningStreakOf(["2026-11-04", "2026-11-05", "2026-11-06"], today)).toBe(3);
  });

  test("GP2. 오늘이 없으면 어제부터 거꾸로 센다(서버 규칙)", () => {
    expect(learningStreakOf(["2026-11-04", "2026-11-05"], today)).toBe(2);
  });

  test("GP2. 오늘도 어제도 없으면 0이다", () => {
    expect(learningStreakOf(["2026-11-03", "2026-11-04"], today)).toBe(0);
    expect(learningStreakOf([], today)).toBe(0);
  });

  test("GP2. 중간이 끊기면 끊긴 뒤(최근 쪽)만 센다", () => {
    expect(learningStreakOf(["2026-11-01", "2026-11-02", "2026-11-05", "2026-11-06"], today)).toBe(
      2,
    );
  });

  test("GP2. 중복 · 역순 · 깨진 문자열은 결과를 바꾸지 않는다", () => {
    expect(
      learningStreakOf(
        ["2026-11-06", "garbage", "2026-11-05", "2026-11-06", "2026-11-04", "2026-13-40", ""],
        today,
      ),
    ).toBe(3);
  });

  test("GP2. 월 경계를 넘어 이어진다", () => {
    expect(learningStreakOf(["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-01")).toBe(3);
  });
});

describe("합치기", () => {
  test("GP3. mergedPendingProgress — 둘 다 없으면 null, 한쪽만 있으면 그쪽 참조", () => {
    expect(mergedPendingProgress(null, null)).toBeNull();
    expect(mergedPendingProgress(userState, null)).toBe(userState);
    expect(mergedPendingProgress(null, guestState)).toBe(guestState);
  });

  test("GP3. mergedPendingProgress — 둘이면 mergeJourneyProgress(user, guest)와 같다", () => {
    expect(mergedPendingProgress(userState, guestState)).toEqual(
      mergeJourneyProgress(userState, guestState),
    );
  });

  test("GP3. mergedPendingDays — 합집합 · 중복 없음 · 오름차순이고 입력은 바뀌지 않는다", () => {
    const user = ["2026-11-05", "2026-11-03"];
    const guest = ["2026-11-04", "2026-11-05"];

    expect(mergedPendingDays(user, guest)).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
    expect(user).toEqual(["2026-11-05", "2026-11-03"]);
    expect(guest).toEqual(["2026-11-04", "2026-11-05"]);
    expect(mergedPendingDays([], [])).toEqual([]);
  });
});

describe("adoptGuestRecords", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: (key: string) => store.get(key) ?? null,
        set: (key: string, value: string) => void store.set(key, value),
        remove: (key: string) => void store.delete(key),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("GP4. 비회원 id는 'guest'다", () => {
    expect(guestProgressId).toBe("guest");
  });

  test("GP4. 비회원 진행 · 날짜가 그 사용자의 미전송 칸으로 옮겨지고 비회원 칸 둘은 지워진다", () => {
    store.set(guestProgressKey, snapshotJson(guestState));
    store.set(guestDaysKey, JSON.stringify(["2026-11-05", "2026-11-06"]));

    adoptGuestRecords("u1");

    expect(JSON.parse(store.get(userProgressKey) ?? "null")).toEqual(
      learningProgressSnapshotFrom(guestState),
    );
    expect(JSON.parse(store.get(userDaysKey) ?? "null")).toEqual(["2026-11-05", "2026-11-06"]);
    expect(store.has(guestProgressKey)).toBe(false);
    expect(store.has(guestDaysKey)).toBe(false);
  });

  test("GP4. 사용자 칸에 이미 값이 있으면 합친 값이 적힌다", () => {
    store.set(guestProgressKey, snapshotJson(guestState));
    store.set(guestDaysKey, JSON.stringify(["2026-11-06", "2026-11-04"]));
    store.set(userProgressKey, snapshotJson(userState));
    store.set(userDaysKey, JSON.stringify(["2026-11-05", "2026-11-06"]));

    adoptGuestRecords("u1");

    const merged = roundTripped(mergeJourneyProgress(userState, guestState));
    expect(journeyProgressFrom(JSON.parse(store.get(userProgressKey) ?? "null"))).toEqual(merged);
    expect(JSON.parse(store.get(userDaysKey) ?? "null")).toEqual([
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
    expect(store.has(guestProgressKey)).toBe(false);
    expect(store.has(guestDaysKey)).toBe(false);
  });

  test("GP4. 비회원 칸이 비어 있으면 사용자 칸 값은 그대로다", () => {
    store.set(userProgressKey, snapshotJson(userState));
    store.set(userDaysKey, JSON.stringify(["2026-11-05"]));
    const before = new Map(store);

    adoptGuestRecords("u1");

    expect(store).toEqual(before);
  });

  test("GP4. 양쪽 칸이 모두 비어 있으면 아무것도 쓰지 않는다", () => {
    const set = vi.fn<(key: string, value: string) => void>();
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: (key: string) => store.get(key) ?? null,
        set,
        remove: (key: string) => void store.delete(key),
      },
    });

    adoptGuestRecords("u1");

    expect(set).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
  });

  test("GP4. 손님 프로필 칸은 건드리지 않는다(프로필은 createLearnerProfileSync가 옮긴다)", () => {
    store.set(guestProfileKey, '{"name":"Emma","countryCode":"DE"}');
    store.set(guestProgressKey, snapshotJson(guestState));
    store.set(guestDaysKey, JSON.stringify(["2026-11-06"]));

    adoptGuestRecords("u1");

    expect(store.get(guestProfileKey)).toBe('{"name":"Emma","countryCode":"DE"}');
    expect(Array.from(store.keys()).filter((key) => key.includes("learner-profile"))).toEqual([
      guestProfileKey,
    ]);
  });

  test("GP5. 저장소 접근이 던져도 adoptGuestRecords는 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: () => {
          throw new Error("get failed");
        },
        set: () => {
          throw new Error("set failed");
        },
        remove: () => {
          throw new Error("remove failed");
        },
      },
    });

    expect(() => adoptGuestRecords("u1")).not.toThrow();
  });
});
