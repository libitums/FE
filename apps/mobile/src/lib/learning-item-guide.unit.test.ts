import { afterEach, describe, expect, test, vi } from "vitest";

import type { LearningItemGuideKind } from "./learning-item-guide.contract";
import {
  learningItemGuideKindFor,
  learningItemGuideKinds,
  learningItemGuideSeenStorageKey,
  loadSeenLearningItemGuides,
  markLearningItemGuideSeen,
  seenLearningItemGuidesFrom,
  shouldShowLearningItemGuide,
  withLearningItemGuideSeen,
} from "./learning-item-guide";
import { allLearningItemGuidesSeenValue } from "./learning-item-guide.test-support";

// `unit` 계층: 학습 문항 안내의 판정 · 저장값 해석 · 갱신, 그리고 저장 접점(저장소 대역).

afterEach(() => {
  vi.unstubAllGlobals();
});

type StorageDouble = {
  readonly store: Map<string, string>;
  readonly get: ReturnType<typeof vi.fn>;
  readonly set: ReturnType<typeof vi.fn>;
};

function installStorage(
  initial?: string,
  options: { readonly setThrows?: boolean } = {},
): StorageDouble {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(learningItemGuideSeenStorageKey, initial);
  const get = vi.fn((key: string) => store.get(key) ?? null);
  const set = vi.fn((key: string, value: string) => {
    if (options.setThrows === true) throw new Error("storage write failed");
    store.set(key, value);
  });
  vi.stubGlobal("NativeModules", {
    StorageModule: { get, set, remove: (key: string) => void store.delete(key) },
  });
  return { store, get, set };
}

// 깨진 값이 남아 있어도 단언 실패(값 불일치)로 드러나게 파싱 실패는 원문을 돌려줍니다.
const savedKinds = (double: StorageDouble): unknown => {
  const raw = double.store.get(learningItemGuideSeenStorageKey) ?? "null";
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

describe("learningItemGuideKindFor", () => {
  test("KF1: 문항이 없으면(null) 종류가 없다", () => {
    expect(learningItemGuideKindFor(null)).toBeNull();
  });

  test("KF2: 조각이 하나인 문장 만들기는 sentence-order", () => {
    expect(learningItemGuideKindFor({ form: "sentence-order", chips: ["가"] })).toBe(
      "sentence-order",
    );
  });

  test("KF3: 조각이 0개 · 2개 · 3개인 문장 만들기는 대상이 아니다", () => {
    expect(learningItemGuideKindFor({ form: "sentence-order", chips: [] })).toBeNull();
    expect(learningItemGuideKindFor({ form: "sentence-order", chips: ["가", "나"] })).toBeNull();
    expect(
      learningItemGuideKindFor({ form: "sentence-order", chips: ["가", "나", "다"] }),
    ).toBeNull();
  });
});

describe("seenLearningItemGuidesFrom", () => {
  test("SF1: 없거나 깨졌거나 배열이 아닌 값은 던지지 않고 빈 배열이다", () => {
    for (const raw of [null, "", "{bad", "3", "{}", "null", '"sentence-order"']) {
      expect(() => seenLearningItemGuidesFrom(raw)).not.toThrow();
      expect(seenLearningItemGuidesFrom(raw)).toEqual([]);
    }
  });

  test("SF2: 아는 종류의 배열은 그대로 읽힌다", () => {
    expect(seenLearningItemGuidesFrom('["sentence-order"]')).toEqual(["sentence-order"]);
  });

  test("SF3: 모르는 값 · 문자열이 아닌 값 · 중복은 버린다", () => {
    expect(
      seenLearningItemGuidesFrom('["nope",7,null,"sentence-order","sentence-order","messenger"]'),
    ).toEqual(["sentence-order"]);
  });
});

describe("withLearningItemGuideSeen", () => {
  test("WS1: 없는 종류는 끝에 더한 새 배열이고 입력은 그대로다", () => {
    const seen: readonly LearningItemGuideKind[] = [];
    const next = withLearningItemGuideSeen(seen, "sentence-order");
    expect(next).toEqual(["sentence-order"]);
    expect(seen).toEqual([]);
  });

  test("WS2: 이미 있는 종류는 같은 참조를 돌려준다", () => {
    const seen: readonly LearningItemGuideKind[] = ["sentence-order"];
    expect(withLearningItemGuideSeen(seen, "sentence-order")).toBe(seen);
  });
});

describe("shouldShowLearningItemGuide", () => {
  test("SS1: 대상이고 저장소가 있고 아직 안 봤으면 띄운다", () => {
    expect(
      shouldShowLearningItemGuide({ kind: "sentence-order", seen: [], storageAvailable: true }),
    ).toBe(true);
  });

  test("SS2: 종류가 없거나, 이미 봤거나, 저장소가 없으면 띄우지 않는다(나머지는 참이 되는 값)", () => {
    expect(shouldShowLearningItemGuide({ kind: null, seen: [], storageAvailable: true })).toBe(
      false,
    );
    expect(
      shouldShowLearningItemGuide({
        kind: "sentence-order",
        seen: ["sentence-order"],
        storageAvailable: true,
      }),
    ).toBe(false);
    expect(
      shouldShowLearningItemGuide({ kind: "sentence-order", seen: [], storageAvailable: false }),
    ).toBe(false);
  });
});

describe("저장 접점", () => {
  test("ST1: 저장된 값을 그 키로 읽는다", () => {
    const double = installStorage('["sentence-order"]');

    expect(loadSeenLearningItemGuides()).toEqual(["sentence-order"]);
    expect(double.get).toHaveBeenCalledWith("libitum.learning-item-guides.seen");
  });

  test("ST2: 저장소가 없으면 던지지 않고 빈 배열이다", () => {
    expect(() => loadSeenLearningItemGuides()).not.toThrow();
    expect(loadSeenLearningItemGuides()).toEqual([]);
  });

  test("ST3: 빈 저장소에서 표시하면 키 한 번에 그 종류 하나가 적힌다", () => {
    const double = installStorage();

    markLearningItemGuideSeen("sentence-order");

    expect(double.set).toHaveBeenCalledTimes(1);
    expect(double.set.mock.calls[0]?.[0]).toBe("libitum.learning-item-guides.seen");
    expect(savedKinds(double)).toEqual(["sentence-order"]);
  });

  test("ST4: 같은 종류를 다시 표시하면 쓰지 않는다", () => {
    const double = installStorage('["sentence-order"]');

    markLearningItemGuideSeen("sentence-order");

    expect(double.set).not.toHaveBeenCalled();
  });

  test("ST5: 깨진 값 위에서는 정상 배열로 덮어쓴다", () => {
    const double = installStorage("{bad");

    expect(() => markLearningItemGuideSeen("sentence-order")).not.toThrow();

    expect(savedKinds(double)).toEqual(["sentence-order"]);
  });

  test("ST6: 쓰기가 던지거나 저장소가 없어도 표시는 던지지 않는다", () => {
    installStorage(undefined, { setThrows: true });
    expect(() => markLearningItemGuideSeen("sentence-order")).not.toThrow();

    vi.unstubAllGlobals();
    expect(() => markLearningItemGuideSeen("sentence-order")).not.toThrow();
  });
});

describe("종류", () => {
  test("KC1: 안내 종류는 sentence-order 하나이고 지원 값이 같은 종류를 낸다", () => {
    expect(learningItemGuideKinds).toEqual(["sentence-order"]);
    expect(seenLearningItemGuidesFrom(allLearningItemGuidesSeenValue)).toEqual(
      learningItemGuideKinds,
    );
  });
});
