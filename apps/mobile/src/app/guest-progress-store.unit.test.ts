import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { saveAuthSession } from "../lib/auth-session";
import { saveGuestSession } from "../lib/guest-session";
import type { LocalDay } from "../lib/learning-progress.contract";
import { createGuestLearningDayStore, createGuestProgressStore } from "./guest-progress-store";
import {
  emptyJourneyProgress,
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";
import type { ProgressLoadOutcome } from "./progress-load.contract";

// 비회원 저장 객체(ADR-0111 §1-4) — 기기에만 적고, 서버 요청은 0건이다.

// 진행 API의 어느 함수도 불리지 않아야 합니다 — 순수 로컬 저장 객체라는 계약의 증거입니다.
const apiSpies = vi.hoisted(() => ({
  authorizedRpc: vi.fn<() => Promise<unknown>>(),
  currentAccessToken: vi.fn<() => Promise<string | null>>(),
  loadLearningProgress: vi.fn<() => Promise<unknown>>(),
  saveLearningProgress: vi.fn<() => Promise<boolean>>(),
  recordLearningDay: vi.fn<() => Promise<number | null>>(),
  recordLearningDays: vi.fn<() => Promise<number | null>>(),
  fetchLearningStreak: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("../lib/progress-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/progress-api")>();
  return { ...actual, ...apiSpies };
});

const guestProgressKey = "libitum.progress.pending.guest";
const guestDaysKey = "libitum.learning-days.pending.guest";

const pendingState: JourneyProgressState = {
  ...emptyJourneyProgress,
  catalogProgress: { "ep-1": ["u00"] },
};
const nextState: JourneyProgressState = {
  ...emptyJourneyProgress,
  catalogProgress: { "ep-1": ["u00", "u01"] },
};

function tokenFor(sub: string): string {
  const payload = btoa(JSON.stringify({ sub }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `e30.${payload}.sig`;
}

let store: Map<string, string>;
let setCalls: string[];
let fetchSpy: ReturnType<typeof vi.fn>;

function plantSession(): void {
  saveAuthSession({ accessToken: tokenFor("u1"), refreshToken: "r", expiresAt: 9_999_999_999 });
}

function setClock(year: number, month: number, day: number): void {
  vi.setSystemTime(new Date(year, month - 1, day, 12, 0, 0));
}

function writesTo(key: string): number {
  return setCalls.filter((written) => written === key).length;
}

beforeEach(() => {
  store = new Map();
  setCalls = [];
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => {
        setCalls.push(key);
        store.set(key, value);
      },
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  setClock(2026, 11, 6);
  for (const spy of Object.values(apiSpies)) spy.mockReset();
  saveGuestSession();
  setCalls = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function expectNoServerCalls(): void {
  for (const spy of Object.values(apiSpies)) expect(spy).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
}

describe("createGuestProgressStore", () => {
  test("GPS1. 비회원 칸이 있으면 만들 때 apply(merge(latest, pending)) 1회 · restoredLocal restored", () => {
    store.set(guestProgressKey, JSON.stringify(learningProgressSnapshotFrom(pendingState)));
    const apply = vi.fn<(next: JourneyProgressState) => void>();

    const handle = createGuestProgressStore(
      () => emptyJourneyProgress,
      apply,
      () => undefined,
    );

    expect(handle.userId).toBe("guest");
    expect(handle.restoredLocal).toBe("restored");
    const restored = journeyProgressFrom(learningProgressSnapshotFrom(pendingState));
    expect(restored).not.toBeNull();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(mergeJourneyProgress(emptyJourneyProgress, restored!));
  });

  test("GPS1. 비회원 칸이 없으면 apply 0 · restoredLocal none이다", () => {
    const apply = vi.fn<(next: JourneyProgressState) => void>();

    const handle = createGuestProgressStore(
      () => emptyJourneyProgress,
      apply,
      () => undefined,
    );

    expect(handle.userId).toBe("guest");
    expect(handle.restoredLocal).toBe("none");
    expect(apply).not.toHaveBeenCalled();
  });

  test("GPS2. flush는 첫 호출에만 onLoadSettled('loaded')를 한 번 내고 서버 요청은 0건이다", async () => {
    const settled = vi.fn<(outcome: ProgressLoadOutcome) => void>();
    const handle = createGuestProgressStore(() => emptyJourneyProgress, vi.fn(), settled);

    await handle.flush();

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith("loaded");

    await handle.flush();

    expect(settled).toHaveBeenCalledTimes(1);
    expectNoServerCalls();
  });

  test("GPS3. capture는 pending.guest에 스냅숏을 적고 같은 내용은 두 번 쓰지 않는다", () => {
    const handle = createGuestProgressStore(
      () => emptyJourneyProgress,
      vi.fn(),
      () => undefined,
    );

    handle.capture(nextState);

    expect(JSON.parse(store.get(guestProgressKey) ?? "null")).toEqual(
      learningProgressSnapshotFrom(nextState),
    );
    expect(writesTo(guestProgressKey)).toBe(1);

    handle.capture(nextState);
    handle.capture({ ...nextState });

    expect(writesTo(guestProgressKey)).toBe(1);
    expect(handle.isCurrent()).toBe(true);
    expectNoServerCalls();
  });

  test("GPS3. 세션이 서면 isCurrent가 거짓이 되어 늦은 capture · flush가 쓰지 않는다", async () => {
    const handle = createGuestProgressStore(
      () => emptyJourneyProgress,
      vi.fn(),
      () => undefined,
    );
    plantSession();

    expect(handle.isCurrent()).toBe(false);
    handle.capture(nextState);
    await handle.flush();

    expect(writesTo(guestProgressKey)).toBe(0);
    expect(store.has(guestProgressKey)).toBe(false);
  });

  test("GPS3. dispose 뒤에는 capture가 쓰지 않는다", () => {
    const handle = createGuestProgressStore(
      () => emptyJourneyProgress,
      vi.fn(),
      () => undefined,
    );

    handle.dispose();

    expect(handle.isCurrent()).toBe(false);
    handle.capture(nextState);
    expect(writesTo(guestProgressKey)).toBe(0);
  });
});

describe("createGuestLearningDayStore", () => {
  const storedDays = (): LocalDay[] => JSON.parse(store.get(guestDaysKey) ?? "[]") as LocalDay[];

  test("GPS4. record는 대기열에 더하고 apply(연속, true)를 낸다 — 같은 날은 중복 없이, 다음 날은 연속 2", async () => {
    const apply = vi.fn<(streak: number, celebrate: boolean) => void>();
    const handle = createGuestLearningDayStore(apply);

    await handle.record("2026-11-06");

    expect(storedDays()).toEqual(["2026-11-06"]);
    expect(apply).toHaveBeenLastCalledWith(1, true);

    await handle.record("2026-11-06");

    expect(storedDays()).toEqual(["2026-11-06"]);
    expect(apply).toHaveBeenLastCalledWith(1, true);

    setClock(2026, 11, 7);
    await handle.record("2026-11-07");

    expect(storedDays()).toEqual(["2026-11-06", "2026-11-07"]);
    expect(apply).toHaveBeenLastCalledWith(2, true);
    expectNoServerCalls();
  });

  test("GPS4. flush는 기기 대기열에서 센 연속을 apply(연속, false)로 낸다", async () => {
    store.set(guestDaysKey, JSON.stringify(["2026-11-05", "2026-11-06"]));
    const apply = vi.fn<(streak: number, celebrate: boolean) => void>();
    const handle = createGuestLearningDayStore(apply);

    await handle.flush();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(2, false);
    expectNoServerCalls();
  });

  test("GPS4. 세션이 서면 record · flush가 no-op이다", async () => {
    const apply = vi.fn<(streak: number, celebrate: boolean) => void>();
    const handle = createGuestLearningDayStore(apply);
    plantSession();

    await handle.record("2026-11-06");
    await handle.flush();

    expect(apply).not.toHaveBeenCalled();
    expect(store.has(guestDaysKey)).toBe(false);
  });
});
