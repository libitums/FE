import { newCatalogFinishGuard } from "./catalog-finish-guard";
import { describe, expect, test } from "vitest";

import { CATALOG_INTRO_KEY } from "../lib/catalog-progress";
import type { CatalogProgress, CatalogUnitKey } from "../lib/catalog-progress";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { noLearnerProfilePort } from "../lib/learner-profile";
import type { LearnerProfilePrompt, LearnerProfileRecord } from "../lib/learner-profile.contract";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type {
  EpisodeIntroEvent,
  EpisodeIntroEventSink,
} from "../screens/episode-intro/episode-intro.contract";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import type { SettingsEvent, SettingsEventSink } from "../screens/settings/settings.contract";
import { catalogWiring } from "./catalog-wiring";
import type { CatalogWiringArgs } from "./catalog-wiring";
import type { EpisodeContent } from "./episode-content";
import { learnerProfileWiring } from "./learner-profile-wiring";
import type { CatalogStarts, LearnerProfileWiringArgs } from "./learner-profile-wiring";
import type { NavAction } from "./nav-state";

// `unit` 계층: 에피소드 전 시작 가드 · 가드 화면의 출구 · 설정 저장의 호출 순서 · 이벤트 · 이동만 봅니다.
// 이름과 나라는 둘 다 있어야 기록입니다.

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

const content: EpisodeContent = {
  catalog: realCatalog,
  imageUrlOf: (path) => `https://cdn/${path}`,
  fillText: fillPlaceholders,
};

// 최종 테스트(RP)까지 끝나야 다음 에피소드의 표지가 열립니다.
const u01Done: CatalogProgress["u01-water"] = [
  "intro",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "CULT",
  "RP",
];
/** u01을 끝내 u02의 표지가 열려 있고 u02의 첫 레슨(S1)은 아직 잠긴 진행입니다. */
const coverOpen: CatalogProgress = { "u01-water": u01Done };
/** u02 표지까지 끝내 첫 레슨(S1)이 열려 있는 진행입니다. */
const lessonOpen: CatalogProgress = { "u01-water": u01Done, "u02-checkin": ["intro"] };

const emma: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };
const liam: LearnerProfileRecord = { name: "Liam", countryCode: "DE" };

const currentFill: LearnerProfile = { name: "Current" };
const savedFill: LearnerProfile = { name: "Saved" };

type Entry =
  | { readonly kind: "start-cover"; readonly fill: LearnerProfile; readonly episodeId: string }
  | {
      readonly kind: "start-unit";
      readonly fill: LearnerProfile;
      readonly episodeId: string;
      readonly unitKey: CatalogUnitKey;
    }
  | { readonly kind: "save"; readonly record: LearnerProfileRecord }
  | { readonly kind: "asked" }
  | { readonly kind: "dispatch"; readonly action: NavAction }
  | { readonly kind: "event"; readonly sink: "episode" | "settings"; readonly event: unknown };

type Options = {
  readonly progress?: CatalogProgress;
  readonly record?: LearnerProfileRecord | null;
  readonly prompt?: LearnerProfilePrompt;
  readonly sinksNull?: boolean;
};

function argsOf(options: Options, log: Entry[]): LearnerProfileWiringArgs {
  const episodeSink: EpisodeIntroEventSink =
    options.sinksNull === true
      ? null
      : (event: EpisodeIntroEvent) => void log.push({ kind: "event", sink: "episode", event });
  const settingsSink: SettingsEventSink =
    options.sinksNull === true
      ? null
      : (event: SettingsEvent) => void log.push({ kind: "event", sink: "settings", event });
  return {
    episodeContent: content,
    catalogSections: catalogMapSectionsOf(realCatalog),
    catalogProgress: options.progress ?? {},
    learnerFill: currentFill,
    learnerRecord: options.record ?? null,
    learnerSync: "none",
    learnerPort: noLearnerProfilePort,
    learnerPrompt: options.prompt ?? "open",
    saveLearnerProfile: (record) => {
      log.push({ kind: "save", record });
      return savedFill;
    },
    markLearnerProfileAsked: () => void log.push({ kind: "asked" }),
    clearGuestLearnerProfile: () => undefined,
    syncLearnerProfile: async () => undefined,
    completedEpisodeFinalIds: [],
    dispatch: (action) => void log.push({ kind: "dispatch", action }),
    episodeIntroEventSink: episodeSink,
    settingsEventSink: settingsSink,
  };
}

function harness(options: Options = {}) {
  const log: Entry[] = [];
  const startsWith = (fill: LearnerProfile): CatalogStarts => ({
    cover: (episodeId) => void log.push({ kind: "start-cover", fill, episodeId }),
    unit: (episodeId, unitKey) => void log.push({ kind: "start-unit", fill, episodeId, unitKey }),
  });
  const wiring = learnerProfileWiring(argsOf(options, log), startsWith);
  return { wiring, log };
}

const ofKind = <K extends Entry["kind"]>(log: readonly Entry[], kind: K) =>
  log.filter((entry): entry is Extract<Entry, { kind: K }> => entry.kind === kind);
const dispatches = (log: readonly Entry[]): NavAction[] =>
  ofKind(log, "dispatch").map((entry) => entry.action);
const events = (log: readonly Entry[], sink: "episode" | "settings"): unknown[] =>
  ofKind(log, "event")
    .filter((entry) => entry.sink === sink)
    .map((entry) => entry.event);
const indexOfKind = (log: readonly Entry[], kind: Entry["kind"]): number =>
  log.findIndex((entry) => entry.kind === kind);
const backIndex = (log: readonly Entry[]): number =>
  log.findIndex((entry) => entry.kind === "dispatch" && entry.action.type === "back");

describe("시작 가드 — 지나가는 경우", () => {
  test("PW-1. 이름 · 나라가 필요 없는 에피소드는 지금 프로필로 원래 시작에 넘긴다", () => {
    const { wiring, log } = harness({ progress: { "u01-water": ["intro"] } });

    wiring.onStartCatalogUnit("u01-water", "S1");

    expect(ofKind(log, "start-unit")).toEqual([
      { kind: "start-unit", fill: currentFill, episodeId: "u01-water", unitKey: "S1" },
    ]);
    expect(ofKind(log, "start-unit")[0]?.fill).toBe(currentFill);
    expect(dispatches(log)).toEqual([]);
  });

  test("PW-1. 표지도 필요 없는 에피소드는 그대로 넘긴다", () => {
    const { wiring, log } = harness();

    wiring.onStartCatalogCover("u01-water");

    expect(ofKind(log, "start-cover")).toEqual([
      { kind: "start-cover", fill: currentFill, episodeId: "u01-water" },
    ]);
    expect(dispatches(log)).toEqual([]);
  });

  test.each([
    ["기록 있음", { record: emma, prompt: "open" }],
    ["이번 세션에 이미 물음", { record: null, prompt: "asked" }],
  ] as const)("PW-5. 필요한 에피소드여도 %s이면 원래 시작에 넘긴다", (_label, options) => {
    const { wiring, log } = harness({ progress: lessonOpen, ...options });

    wiring.onStartCatalogUnit("u02-checkin", "S1");

    expect(ofKind(log, "start-unit")).toHaveLength(1);
    expect(ofKind(log, "start-unit")[0]?.fill).toBe(currentFill);
    expect(dispatches(log)).toEqual([]);
  });
});

describe("시작 가드 — 묻는 경우", () => {
  test("PW-2. 필요 · 기록 없음 · 안 물음이면 가드 화면을 쌓고 원래 시작은 부르지 않는다", () => {
    const { wiring, log } = harness({ progress: lessonOpen });

    wiring.onStartCatalogUnit("u02-checkin", "S1");

    expect(dispatches(log)).toEqual([
      {
        type: "push",
        screen: { name: "learner-profile-gate", episodeId: "u02-checkin", unitKey: "S1" },
      },
    ]);
    expect(ofKind(log, "start-unit")).toEqual([]);
    expect(ofKind(log, "start-cover")).toEqual([]);
    expect(events(log, "episode")).toEqual([]);
    expect(events(log, "settings")).toEqual([]);
  });

  test("PW-3. 표지 시작은 표지 키를 들고 가드 화면을 쌓는다", () => {
    const { wiring, log } = harness({ progress: coverOpen });

    wiring.onStartCatalogCover("u02-checkin");

    expect(dispatches(log)).toEqual([
      {
        type: "push",
        screen: {
          name: "learner-profile-gate",
          episodeId: "u02-checkin",
          unitKey: CATALOG_INTRO_KEY,
        },
      },
    ]);
    expect(ofKind(log, "start-cover")).toEqual([]);
  });

  test.each([
    ["잠긴 유닛", "u02-checkin", "S3", coverOpen],
    ["없는 에피소드", "nope", "S1", lessonOpen],
    ["없는 키", "u02-checkin", "S2", lessonOpen],
  ] as const)(
    "PW-4. %s는 가드 화면을 쌓지 않고 원래 시작에 넘긴다",
    (_label, episodeId, key, progress) => {
      const { wiring, log } = harness({ progress });

      wiring.onStartCatalogUnit(episodeId, key);

      expect(dispatches(log)).toEqual([]);
      expect(ofKind(log, "start-unit")).toEqual([
        { kind: "start-unit", fill: currentFill, episodeId, unitKey: key },
      ]);
    },
  );

  test("PW-4. 잠긴 표지도 가드 화면을 쌓지 않는다", () => {
    const { wiring, log } = harness({ progress: {} });

    wiring.onStartCatalogCover("u02-checkin");

    expect(dispatches(log)).toEqual([]);
    expect(ofKind(log, "start-cover")).toEqual([
      { kind: "start-cover", fill: currentFill, episodeId: "u02-checkin" },
    ]);
  });

  test("PW-13. catalogWiring이 낸 시작 함수가 가드판이다", () => {
    const wiringOf = (progress: CatalogProgress, log: Entry[]) => {
      const args: CatalogWiringArgs = {
        ...argsOf({ progress }, log),
        setCatalogProgress: () => undefined,
        pendingResults: [],
        setPendingResults: () => undefined,
        pendingSkippedCount: 0,
        setPendingSkippedCount: () => undefined,
        finishGuard: newCatalogFinishGuard(),
      };
      return catalogWiring(args);
    };
    const unitLog: Entry[] = [];
    const coverLog: Entry[] = [];

    wiringOf(lessonOpen, unitLog).onStartCatalogUnit("u02-checkin", "S1");
    wiringOf(coverOpen, coverLog).onStartCatalogCover("u02-checkin");

    expect(dispatches(unitLog)).toEqual([
      {
        type: "push",
        screen: { name: "learner-profile-gate", episodeId: "u02-checkin", unitKey: "S1" },
      },
    ]);
    expect(dispatches(coverLog)).toEqual([
      {
        type: "push",
        screen: {
          name: "learner-profile-gate",
          episodeId: "u02-checkin",
          unitKey: CATALOG_INTRO_KEY,
        },
      },
    ]);
    expect(events(unitLog, "episode")).toEqual([]);
    expect(events(coverLog, "episode")).toEqual([]);
  });
});

describe("가드 화면의 출구", () => {
  const record = emma;

  test("PW-6. 저장: 저장 → 물었음 → 이벤트 → back → 저장이 돌려준 프로필로 원래 유닛 시작", () => {
    const { wiring, log } = harness({ progress: lessonOpen });

    wiring.onResolveLearnerProfileGate("u02-checkin", "S1", { kind: "saved", record });

    expect(ofKind(log, "save")).toEqual([{ kind: "save", record }]);
    expect(events(log, "episode")).toEqual([
      { name: "learner_profile_saved", entry: "episode", change: "created" },
    ]);
    expect(dispatches(log)).toEqual([{ type: "back" }]);
    const started = ofKind(log, "start-unit");
    expect(started).toHaveLength(1);
    expect(started[0]?.fill).toBe(savedFill);
    expect(started[0]).toMatchObject({ episodeId: "u02-checkin", unitKey: "S1" });
    const order = [
      indexOfKind(log, "save"),
      indexOfKind(log, "asked"),
      indexOfKind(log, "event"),
      backIndex(log),
      indexOfKind(log, "start-unit"),
    ];
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("PW-7. 건너뜀: 저장 없이 물었음만 적고 지금 프로필로 원래 유닛을 시작한다", () => {
    const { wiring, log } = harness({ progress: lessonOpen });

    wiring.onResolveLearnerProfileGate("u02-checkin", "S1", { kind: "skipped" });

    expect(ofKind(log, "save")).toEqual([]);
    expect(ofKind(log, "asked")).toHaveLength(1);
    expect(events(log, "episode")).toEqual([{ name: "learner_profile_skipped", entry: "episode" }]);
    expect(dispatches(log)).toEqual([{ type: "back" }]);
    expect(ofKind(log, "start-unit")[0]?.fill).toBe(currentFill);
    expect(backIndex(log)).toBeLessThan(indexOfKind(log, "start-unit"));
  });

  test("PW-8. 표지 키로 풀면 표지 시작을 부른다", () => {
    const saved = harness({ progress: coverOpen });
    saved.wiring.onResolveLearnerProfileGate("u02-checkin", CATALOG_INTRO_KEY, {
      kind: "saved",
      record,
    });
    const skipped = harness({ progress: coverOpen });
    skipped.wiring.onResolveLearnerProfileGate("u02-checkin", CATALOG_INTRO_KEY, {
      kind: "skipped",
    });

    expect(ofKind(saved.log, "start-cover")).toEqual([
      { kind: "start-cover", fill: savedFill, episodeId: "u02-checkin" },
    ]);
    expect(ofKind(saved.log, "start-unit")).toEqual([]);
    expect(ofKind(skipped.log, "start-cover")).toEqual([
      { kind: "start-cover", fill: currentFill, episodeId: "u02-checkin" },
    ]);
    expect(ofKind(skipped.log, "start-unit")).toEqual([]);
  });

  test("PW-9. 취소는 back만 한다 — 이벤트도 물었음 기록도 없다", () => {
    const { wiring, log } = harness({ progress: lessonOpen });

    wiring.onCancelLearnerProfileGate();

    expect(dispatches(log)).toEqual([{ type: "back" }]);
    expect(ofKind(log, "event")).toEqual([]);
    expect(ofKind(log, "asked")).toEqual([]);
    expect(ofKind(log, "save")).toEqual([]);
    expect(ofKind(log, "start-unit")).toEqual([]);
  });
});

describe("설정 저장", () => {
  test("PW-10. 값이 다르면 저장하고 updated 이벤트를 settings sink로 내며 루트로 돌아간다", () => {
    const { wiring, log } = harness({ record: emma });

    wiring.onSubmitLearnerProfile(liam);

    expect(ofKind(log, "save")).toEqual([{ kind: "save", record: liam }]);
    expect(events(log, "settings")).toEqual([
      { name: "learner_profile_saved", entry: "settings", change: "updated" },
    ]);
    expect(events(log, "episode")).toEqual([]);
    expect(dispatches(log)).toEqual([{ type: "backToRoot" }]);
    expect(indexOfKind(log, "save")).toBeLessThan(
      log.findIndex((entry) => entry.kind === "dispatch"),
    );
  });

  test("PW-11. 값이 같으면 저장도 이벤트도 없이 루트로만 돌아간다", () => {
    const { wiring, log } = harness({ record: emma });

    wiring.onSubmitLearnerProfile({ ...emma });

    expect(ofKind(log, "save")).toEqual([]);
    expect(ofKind(log, "event")).toEqual([]);
    expect(dispatches(log)).toEqual([{ type: "backToRoot" }]);
  });

  test("PW-12. sink가 null이어도 어느 출구에서나 던지지 않는다", () => {
    const { wiring } = harness({ progress: lessonOpen, record: emma, sinksNull: true });

    expect(() => {
      wiring.onResolveLearnerProfileGate("u02-checkin", "S1", { kind: "saved", record: liam });
      wiring.onResolveLearnerProfileGate("u02-checkin", "S1", { kind: "skipped" });
      wiring.onCancelLearnerProfileGate();
      wiring.onSubmitLearnerProfile(liam);
    }).not.toThrow();
  });
});
