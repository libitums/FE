import { describe, expect, test } from "vitest";

import type { ContractProgressState } from "./test-helpers/progress-state-api";
import {
  emptyContractState as base,
  progressApi,
  serverAcceptsSnapshot,
} from "./test-helpers/progress-state-api";

// `unit` 계층: 진행 스냅숏에 실린 엽전을 받은 유닛(선택 필드 `coinUnits`, ADR-0116).

const { journeyProgressCovers, journeyProgressFrom, learningProgressSnapshotFrom } = progressApi;
const { mergeJourneyProgress, completedActivityCount } = progressApi;

const coinUnits = { "u01-water": ["S1"] };

function roundTrip(state: ContractProgressState): ContractProgressState | null {
  return journeyProgressFrom(JSON.parse(JSON.stringify(learningProgressSnapshotFrom(state))));
}

describe("LP-C1 스냅숏", () => {
  test("받은 유닛은 `coinUnits`로 실리고 서버 검사를 통과하며 다시 읽으면 같다", () => {
    const snapshot = learningProgressSnapshotFrom({ ...base, coinUnits });
    expect(snapshot.coinUnits).toEqual(coinUnits);
    expect(serverAcceptsSnapshot(snapshot)).toBe(true);
    expect(roundTrip({ ...base, coinUnits })?.coinUnits).toEqual(coinUnits);
  });

  test("비었거나 없으면 싣지 않는다 — 옛 서버 · 옛 앱과 바이트가 같다", () => {
    const plain = JSON.stringify(learningProgressSnapshotFrom(base));
    expect(JSON.stringify(learningProgressSnapshotFrom({ ...base, coinUnits: {} }))).toBe(plain);
    expect(roundTrip(base)?.coinUnits).toBeUndefined();
  });
});

describe("LP-C2 읽기", () => {
  test("모양이 틀리면 그 필드만 비우고 나머지 진행은 그대로 읽는다", () => {
    const snapshot = learningProgressSnapshotFrom({
      ...base,
      catalogProgress: { "u01-water": ["S1"] },
      coinUnits,
    });
    const read = journeyProgressFrom({ ...snapshot, coinUnits: "x" });
    expect(read?.coinUnits).toEqual({});
    expect(read?.catalogProgress).toEqual({ "u01-water": ["S1"] });
  });
});

describe("LP-C3 병합", () => {
  test("키별 합집합 — 두 기기에서 받은 엽전이 합쳐지고 줄지 않는다", () => {
    const merged = mergeJourneyProgress(
      { ...base, coinUnits },
      { ...base, coinUnits: { "u01-water": ["S2"], "u02-checkin": ["S1"] } },
    );
    expect(merged.coinUnits).toEqual({ "u01-water": ["S1", "S2"], "u02-checkin": ["S1"] });
    expect(mergeJourneyProgress(base, base).coinUnits).toBeUndefined();
  });

  test("서버에 없는 유닛이 있으면 덮지 않았다고 본다", () => {
    expect(journeyProgressCovers(base, { ...base, coinUnits })).toBe(false);
    expect(journeyProgressCovers({ ...base, coinUnits }, base)).toBe(true);
  });
});

describe("LP-C4 활동 수", () => {
  test("엽전을 받은 유닛은 활동 수에 들지 않는다(연속 · 트로피는 카탈로그 진행만 본다)", () => {
    expect(completedActivityCount({ ...base, coinUnits })).toBe(completedActivityCount(base));
  });
});
