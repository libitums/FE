import { afterEach, describe, expect, test, vi } from "vitest";

import { initialSessionOptions } from "./session-options";
import {
  choiceRomanizationStorageKey,
  loadSessionOptions,
  saveSessionOption,
  storedChoiceRomanizationFrom,
} from "./session-options-storage";

// `unit` 계층: 보기 로마자 설정의 기기 저장 — 읽기 해석 · 불러오기 · 쓰기의 입출력만 봅니다.
// 저장소는 호스트 모듈 경계(NativeModules.StorageModule)에서 대체합니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubStore(stored: string | null = null) {
  const store = {
    get: vi.fn<(key: string) => string | null>(() => stored),
    set: vi.fn<(key: string, value: string) => void>(() => {}),
    remove: vi.fn<(key: string) => void>(() => {}),
  };
  vi.stubGlobal("NativeModules", { StorageModule: store });
  return store;
}

describe("storedChoiceRomanizationFrom", () => {
  test("CR2. 정확히 off일 때만 false다", () => {
    expect(storedChoiceRomanizationFrom("off")).toBe(false);
  });

  test.each([["on"], [null], [""], ["false"], [0], [undefined], ["OFF"], [" off"]])(
    "CR2. %j는 true다(기본 켬)",
    (stored) => {
      expect(storedChoiceRomanizationFrom(stored)).toBe(true);
    },
  );
});

describe("loadSessionOptions", () => {
  test("CR3. 저장된 off는 새 키만 false로 만들고 다른 둘은 초기값이다", () => {
    const store = stubStore("off");

    const options = loadSessionOptions();

    expect(store.get).toHaveBeenCalledWith(choiceRomanizationStorageKey);
    expect(options["show-choice-romanization"]).toBe(false);
    expect(options["auto-play-audio"]).toBe(initialSessionOptions["auto-play-audio"]);
    expect(options["show-transcript"]).toBe(initialSessionOptions["show-transcript"]);
  });

  test("CR3. 저장 키가 없거나 깨진 값이면 초기값(켬)이다", () => {
    stubStore(null);
    expect(loadSessionOptions()).toEqual(initialSessionOptions);

    stubStore("garbage");
    expect(loadSessionOptions()).toEqual(initialSessionOptions);
  });

  test("CR3. 저장소 모듈이 없으면 초기값이다", () => {
    vi.stubGlobal("NativeModules", undefined);

    expect(loadSessionOptions()).toEqual(initialSessionOptions);
  });

  test("CR3. 읽기가 던지면 초기값(켬)이고 던지지 않는다", () => {
    const store = stubStore();
    store.get.mockImplementation(() => {
      throw new Error("read failed");
    });

    expect(() => loadSessionOptions()).not.toThrow();
    expect(loadSessionOptions()).toEqual(initialSessionOptions);
  });
});

describe("saveSessionOption", () => {
  test("CR4. 저장 키는 libitum.session-option.show-choice-romanization이다", () => {
    expect(choiceRomanizationStorageKey).toBe("libitum.session-option.show-choice-romanization");
  });

  test("CR4. 새 키 false는 off, true는 on으로 쓴다", () => {
    const store = stubStore();

    saveSessionOption("show-choice-romanization", false);
    saveSessionOption("show-choice-romanization", true);

    expect(store.set.mock.calls).toEqual([
      ["libitum.session-option.show-choice-romanization", "off"],
      ["libitum.session-option.show-choice-romanization", "on"],
    ]);
  });

  test("CR4. 다른 두 키는 저장소를 건드리지 않는다", () => {
    const store = stubStore();

    saveSessionOption("auto-play-audio", false);
    saveSessionOption("show-transcript", true);

    expect(store.set).toHaveBeenCalledTimes(0);
    expect(store.remove).toHaveBeenCalledTimes(0);
  });

  test("CR4. 쓰기가 던져도 던지지 않는다", () => {
    const store = stubStore();
    store.set.mockImplementation(() => {
      throw new Error("write failed");
    });

    expect(() => saveSessionOption("show-choice-romanization", false)).not.toThrow();
  });

  test("CR4. 저장 뒤 불러오면 같은 값이 돌아온다", () => {
    let saved: string | null = null;
    const store = stubStore();
    store.set.mockImplementation((_key, value) => {
      saved = value;
    });
    store.get.mockImplementation(() => saved);

    saveSessionOption("show-choice-romanization", false);

    expect(loadSessionOptions()["show-choice-romanization"]).toBe(false);
  });
});
