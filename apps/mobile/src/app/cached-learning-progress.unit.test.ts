import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  cachedProgressKey,
  clearCachedProgress,
  readCachedProgress,
  writeCachedProgress,
} from "./cached-learning-progress";
import { productJourneySeed } from "./journey-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

type Ops = { op: "get" | "set" | "remove"; key: string }[];
let store: Map<string, string>;
let ops: Ops;

function stubStorage(over: { get?: () => never; set?: () => never; remove?: () => never } = {}) {
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => {
        ops.push({ op: "get", key });
        if (over.get) return over.get();
        return store.get(key) ?? null;
      },
      set: (key: string, value: string) => {
        ops.push({ op: "set", key });
        if (over.set) over.set();
        store.set(key, value);
      },
      remove: (key: string) => {
        ops.push({ op: "remove", key });
        if (over.remove) over.remove();
        store.delete(key);
      },
    },
  });
}

const boom = (): never => {
  throw new Error("storage failure");
};
const pendingKey = (u: string) => `libitum.progress.pending.${u}`;

const state: JourneyProgressState = {
  ...productJourneySeed,
  completedStepCount: 2,
  completedEpisodeIntroIds: ["tutorial-intro"],
  catalogProgress: { u01: ["intro", "S1"] },
};

beforeEach(() => {
  store = new Map();
  ops = [];
  stubStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CP 저장본", () => {
  test("CP1. 키에는 사용자 id가 들어가고 미전송 키와 다르다", () => {
    expect(cachedProgressKey("u-1")).toBe("libitum.progress.cached.u-1");
    expect(cachedProgressKey("u-1")).not.toBe(pendingKey("u-1"));
    expect(cachedProgressKey("u-1")).not.toBe(cachedProgressKey("u-2"));
  });

  test("CP2. 쓰고 읽으면 같은 진행이고 원문은 스냅숏 JSON(version 1)이다", () => {
    writeCachedProgress("u-1", state);
    expect(store.get(cachedProgressKey("u-1"))).toBe(
      JSON.stringify(learningProgressSnapshotFrom(state)),
    );
    expect(JSON.parse(store.get(cachedProgressKey("u-1")) ?? "{}")).toMatchObject({ version: 1 });
    expect(readCachedProgress("u-1")).toEqual(state);
  });

  test("CP2. 다른 사용자의 저장본은 읽히지 않는다", () => {
    writeCachedProgress("u-1", state);
    expect(readCachedProgress("u-2")).toBeNull();
  });

  test("CP3. 키가 없으면 null", () => {
    expect(readCachedProgress("u-1")).toBeNull();
  });

  const brokenValues: readonly (readonly [string, string])[] = [
    ["깨진 JSON", "{bad"],
    ["빈 문자열", ""],
    ["null", "null"],
    ["배열", "[]"],
    ["모르는 버전", JSON.stringify({ version: 2 })],
    [
      "음수 스텝",
      JSON.stringify({ ...learningProgressSnapshotFrom(state), completedStepCount: -1 }),
    ],
    [
      "문자열 스텝",
      JSON.stringify({ ...learningProgressSnapshotFrom(state), completedStepCount: "2" }),
    ],
  ];

  test.each(brokenValues)("CP4. %s는 던지지 않고 null", (_label, raw) => {
    store.set(cachedProgressKey("u-1"), raw);
    expect(() => readCachedProgress("u-1")).not.toThrow();
    expect(readCachedProgress("u-1")).toBeNull();
  });

  test("CP5. 모르는 유닛 id는 버리고 아는 id만 남는다", () => {
    store.set(
      cachedProgressKey("u-1"),
      JSON.stringify({
        ...learningProgressSnapshotFrom(state),
        completedEpisodeIntroIds: ["tutorial-intro", "ghost-unit"],
        completedMessengerUnitIds: ["ghost-unit"],
      }),
    );
    const read = readCachedProgress("u-1");
    expect(read?.completedEpisodeIntroIds).toEqual(["tutorial-intro"]);
    expect(read?.completedMessengerUnitIds).toEqual([]);
  });

  test("CP6. get이 던지면 읽기는 null", () => {
    stubStorage({ get: boom });
    expect(readCachedProgress("u-1")).toBeNull();
  });

  test("CP6. set이 던져도 쓰기는 던지지 않는다", () => {
    stubStorage({ set: boom });
    expect(() => writeCachedProgress("u-1", state)).not.toThrow();
  });

  test("CP6. remove가 던져도 지우기는 던지지 않는다", () => {
    stubStorage({ remove: boom });
    expect(() => clearCachedProgress("u-1")).not.toThrow();
  });

  test("CP7. 지우기는 그 사용자의 저장본 키만 지운다", () => {
    writeCachedProgress("u-1", state);
    writeCachedProgress("other", state);
    store.set(pendingKey("u-1"), "pending-raw");
    ops.length = 0;

    clearCachedProgress("u-1");

    expect(store.has(cachedProgressKey("u-1"))).toBe(false);
    expect(store.get(pendingKey("u-1"))).toBe("pending-raw");
    expect(store.has(cachedProgressKey("other"))).toBe(true);
    expect(ops).toEqual([{ op: "remove", key: cachedProgressKey("u-1") }]);
  });

  test("CP8. 저장소가 없으면 읽기는 null이고 쓰기 · 지우기는 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", undefined);
    expect(readCachedProgress("u-1")).toBeNull();
    expect(() => writeCachedProgress("u-1", state)).not.toThrow();
    expect(() => clearCachedProgress("u-1")).not.toThrow();
  });
});
