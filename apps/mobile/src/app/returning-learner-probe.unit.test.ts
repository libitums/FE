import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { loadLearnerProfile } from "../lib/learner-profile-api";
import { loadLearningProgress } from "../lib/progress-api";
import { emptyLegacyTutorialRecord } from "./legacy-tutorial-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { returningLearnerWaitMs } from "./returning-learner";
import type {
  EntryRouteAfterLogin,
  LearnerProfileLoadResult,
  LearningProgressLoadResult,
} from "./returning-learner";
import {
  probeEntryRouteAfterLogin,
  productReturningLearnerProbeDeps,
} from "./returning-learner-probe";
import type { ReturningLearnerProbeDeps } from "./returning-learner-probe";

// unit 계층: 가짜 loader와 가짜 타이머로 조회 · 3초 경주 상태 기계만 봅니다.

const waitMs = returningLearnerWaitMs;
const progressAbsent: LearningProgressLoadResult = { ok: true, raw: null };
const progressPresent: LearningProgressLoadResult = {
  ok: true,
  raw: learningProgressSnapshotFrom({
    legacyTutorial: { ...emptyLegacyTutorialRecord, completedStepCount: 1 },
    catalogProgress: {},
  }),
};
const profileAbsent: LearnerProfileLoadResult = { ok: true, record: null };
const profilePresent: LearnerProfileLoadResult = {
  ok: true,
  record: { name: "Mina", countryCode: "KR" },
};

const never = (): Promise<never> => new Promise(() => undefined);

function deps(
  loadProgress: () => Promise<LearningProgressLoadResult>,
  loadProfile: () => Promise<LearnerProfileLoadResult>,
): ReturningLearnerProbeDeps {
  return { loadProgress, loadProfile, waitMs };
}

/** 결정된 경로와 reject 여부를 모아 둡니다. */
function watch(probe: Promise<EntryRouteAfterLogin>) {
  const settled: EntryRouteAfterLogin[] = [];
  const rejected: unknown[] = [];
  probe.then(
    (route) => settled.push(route),
    (error: unknown) => rejected.push(error),
  );
  return { settled, rejected };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("probeEntryRouteAfterLogin", () => {
  test("RP1. 둘 다 곧바로 absent면 언어 선택이고 타이머가 남지 않는다", async () => {
    const watched = watch(
      probeEntryRouteAfterLogin(
        deps(
          () => Promise.resolve(progressAbsent),
          () => Promise.resolve(profileAbsent),
        ),
      ),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(watched.settled).toEqual(["language-select"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("RP2. 프로필 present면 진행을 기다리지 않고 맵이며 타이머가 남지 않는다", async () => {
    const watched = watch(
      probeEntryRouteAfterLogin(deps(never, () => Promise.resolve(profilePresent))),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(watched.settled).toEqual(["journey-map"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("RP3. 둘 다 대기하면 2999 ms까지 미결이고 3000 ms에 언어 선택이다", async () => {
    const watched = watch(probeEntryRouteAfterLogin(deps(never, never)));
    await vi.advanceTimersByTimeAsync(waitMs - 1);
    expect(watched.settled).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(watched.settled).toEqual(["language-select"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("RP4. loader가 reject하거나 동기 throw해도 reject하지 않고 언어 선택이다", async () => {
    const rejecting = watch(
      probeEntryRouteAfterLogin(
        deps(
          () => Promise.reject(new Error("boom")),
          () => Promise.resolve(profileAbsent),
        ),
      ),
    );
    const throwing = watch(
      probeEntryRouteAfterLogin(
        deps(
          () => {
            throw new Error("sync boom");
          },
          () => Promise.resolve(profileAbsent),
        ),
      ),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(rejecting.settled).toEqual(["language-select"]);
    expect(throwing.settled).toEqual(["language-select"]);
    expect(rejecting.rejected).toHaveLength(0);
    expect(throwing.rejected).toHaveLength(0);
  });

  test("RP5. 시간 초과 뒤 도착한 present는 이미 낸 경로를 바꾸지 않는다", async () => {
    let resolveLate: (value: LearningProgressLoadResult) => void = () => undefined;
    const late = new Promise<LearningProgressLoadResult>((done) => {
      resolveLate = done;
    });
    const watched = watch(
      probeEntryRouteAfterLogin(
        deps(
          () => late,
          () => Promise.resolve(profileAbsent),
        ),
      ),
    );
    await vi.advanceTimersByTimeAsync(waitMs);
    expect(watched.settled).toEqual(["language-select"]);
    resolveLate(progressPresent);
    await vi.advanceTimersByTimeAsync(0);
    expect(watched.settled).toEqual(["language-select"]);
  });

  test("RP6. loader 둘을 각 한 번, 호출 직후 이미 불렀다", async () => {
    const loadProgress = vi.fn<() => Promise<LearningProgressLoadResult>>(() =>
      Promise.resolve(progressAbsent),
    );
    const loadProfile = vi.fn<() => Promise<LearnerProfileLoadResult>>(() =>
      Promise.resolve(profileAbsent),
    );
    const probe = probeEntryRouteAfterLogin(deps(loadProgress, loadProfile));
    expect(loadProgress).toHaveBeenCalledTimes(1);
    expect(loadProfile).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    await probe;
    expect(loadProgress).toHaveBeenCalledTimes(1);
    expect(loadProfile).toHaveBeenCalledTimes(1);
  });

  test("RP7. absent + unknown은 언어 선택 · unknown + present는 맵이다", async () => {
    const absentUnknown = watch(
      probeEntryRouteAfterLogin(
        deps(
          () => Promise.resolve(progressAbsent),
          () => Promise.resolve({ ok: false }),
        ),
      ),
    );
    const unknownPresent = watch(
      probeEntryRouteAfterLogin(
        deps(
          () => Promise.resolve({ ok: false }),
          () => Promise.resolve(profilePresent),
        ),
      ),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(absentUnknown.settled).toEqual(["language-select"]);
    expect(unknownPresent.settled).toEqual(["journey-map"]);
  });

  test("RP8. 제품 deps는 실제 loader · 대기 상수와 같은 참조이다", () => {
    expect(productReturningLearnerProbeDeps.loadProgress).toBe(loadLearningProgress);
    expect(productReturningLearnerProbeDeps.loadProfile).toBe(loadLearnerProfile);
    expect(productReturningLearnerProbeDeps.waitMs).toBe(returningLearnerWaitMs);
  });
});
