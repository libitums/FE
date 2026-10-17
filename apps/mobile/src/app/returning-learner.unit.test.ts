import { describe, expect, test } from "vitest";

import { productJourneySeed } from "./journey-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";
import {
  entryRouteOnTimeoutOf,
  hasLearningRecord,
  pendingLearnerRecordSignals,
  profileSignalOf,
  progressSignalOf,
  returningLearnerWaitMs,
  settledEntryRouteOf,
} from "./returning-learner";
import type {
  EntryRouteAfterLogin,
  LearnerRecordSignal,
  LearnerRecordSignals,
} from "./returning-learner";

// unit 계층: 판정 순수 함수의 입출력만 봅니다.

const emptyProgress: JourneyProgressState = {
  ...productJourneySeed,
  completedEpisodeIntroIds: [],
  catalogProgress: {},
};

const signalKinds: readonly LearnerRecordSignal[] = ["pending", "present", "absent", "unknown"];

describe("hasLearningRecord", () => {
  test("RJ1. 빈 진행은 거짓이다", () => {
    expect(hasLearningRecord(emptyProgress)).toBe(false);
  });

  test.each([
    ["스텝", { completedStepCount: 1 }],
    ["표지", { completedEpisodeIntroIds: ["tutorial-intro"] }],
    ["메신저", { completedMessengerUnitIds: ["appointment-confirmation"] }],
    ["전화", { completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"] }],
    ["최종", { completedEpisodeFinalIds: ["tutorial-final-test"] }],
    ["VN 완료", { visualNovelProgress: { status: "completed", beatIndex: 2 } }],
    ["카탈로그", { catalogProgress: { "u01-water": ["S1"] } }],
    ["VN 진행 중", { visualNovelProgress: { status: "active", beatIndex: 1 } }],
  ] as const)("RJ1. %s 하나만 채워도 참이다", (_label, patch) => {
    expect(hasLearningRecord({ ...emptyProgress, ...patch })).toBe(true);
  });

  test("RJ1. 빈 카탈로그 키 목록은 기록이 아니다", () => {
    expect(hasLearningRecord({ ...emptyProgress, catalogProgress: { "u01-water": [] } })).toBe(
      false,
    );
  });
});

describe("progressSignalOf", () => {
  test.each([
    ["ok:false", { ok: false }],
    ["invalidResponse", { ok: false, invalidResponse: true }],
    ["모르는 버전", { ok: true, raw: { version: 2 } }],
    ["문자열", { ok: true, raw: "x" }],
    ["배열", { ok: true, raw: [] }],
  ] as const)("RJ2. %s는 unknown이다", (_label, loaded) => {
    expect(progressSignalOf(loaded)).toBe("unknown");
  });

  test("RJ2. 저장된 적 없으면 absent이다", () => {
    expect(progressSignalOf({ ok: true, raw: null })).toBe("absent");
  });

  test("RJ2. 빈 스냅숏은 absent이다", () => {
    const raw = learningProgressSnapshotFrom(emptyProgress);
    expect(progressSignalOf({ ok: true, raw })).toBe("absent");
  });

  test("RJ2. 스텝이 있는 스냅숏은 present이다", () => {
    const raw = learningProgressSnapshotFrom({ ...emptyProgress, completedStepCount: 1 });
    expect(progressSignalOf({ ok: true, raw })).toBe("present");
  });

  test("RJ2. VN 진행 중 스냅숏은 present이다", () => {
    const raw = learningProgressSnapshotFrom({
      ...emptyProgress,
      visualNovelProgress: { status: "active", beatIndex: 1 },
    });
    expect(progressSignalOf({ ok: true, raw })).toBe("present");
  });
});

describe("profileSignalOf", () => {
  test("RJ3. 실패는 unknown · 행 없음은 absent · 행 있음은 present이다", () => {
    expect(profileSignalOf({ ok: false })).toBe("unknown");
    expect(profileSignalOf({ ok: true, record: null })).toBe("absent");
    expect(profileSignalOf({ ok: true, record: { name: "Mina", countryCode: "KR" } })).toBe(
      "present",
    );
  });
});

// 행 = progress, 열 = profile (pending · present · absent · unknown). 맵 7 · 언어 선택 4 · null 5.
const settledTable: Record<LearnerRecordSignal, readonly (EntryRouteAfterLogin | null)[]> = {
  pending: [null, "journey-map", null, null],
  present: ["journey-map", "journey-map", "journey-map", "journey-map"],
  absent: [null, "journey-map", "language-select", "language-select"],
  unknown: [null, "journey-map", "language-select", "language-select"],
};

const cells = signalKinds.flatMap((progress) =>
  signalKinds.map((profile, column) => ({
    signals: { progress, profile } as LearnerRecordSignals,
    settled: settledTable[progress][column] ?? null,
    label: `${progress} x ${profile}`,
  })),
);

describe("경로 판정 16칸", () => {
  test("RJ4. 표가 맵 7 · 언어 선택 4 · null 5이다", () => {
    const settled = cells.map((cell) => cell.settled);
    expect(cells).toHaveLength(16);
    expect(settled.filter((route) => route === "journey-map")).toHaveLength(7);
    expect(settled.filter((route) => route === "language-select")).toHaveLength(4);
    expect(settled.filter((route) => route === null)).toHaveLength(5);
  });

  test.each(cells.map((cell) => [cell.label, cell] as const))(
    "RJ4. settledEntryRouteOf %s",
    (_label, cell) => {
      expect(settledEntryRouteOf(cell.signals)).toBe(cell.settled);
    },
  );

  test.each(cells.map((cell) => [cell.label, cell] as const))(
    "RJ5. entryRouteOnTimeoutOf %s",
    (_label, cell) => {
      const hasPresent = cell.signals.progress === "present" || cell.signals.profile === "present";
      expect(entryRouteOnTimeoutOf(cell.signals)).toBe(
        hasPresent ? "journey-map" : "language-select",
      );
    },
  );
});

describe("상수 · 불변", () => {
  test("RJ6. 대기 3000 ms · 시작 신호는 둘 다 pending이다", () => {
    expect(returningLearnerWaitMs).toBe(3000);
    expect(pendingLearnerRecordSignals).toEqual({ progress: "pending", profile: "pending" });
  });

  test("RJ6. 얼린 입력으로도 같은 결과이고 던지지 않는다", () => {
    for (const cell of cells) {
      const frozen = Object.freeze({ ...cell.signals });
      expect(settledEntryRouteOf(frozen)).toBe(cell.settled);
      expect(() => entryRouteOnTimeoutOf(frozen)).not.toThrow();
      expect(frozen).toEqual(cell.signals);
    }
  });
});
