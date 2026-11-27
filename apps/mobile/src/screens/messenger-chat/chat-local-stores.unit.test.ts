import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { UNLOCKED_KEY, memoryUnlockStore, parseUnlocked } from "./chat-local-stores";

// `unit` 계층(MC2-U24): 무료 수 원장 · 해금 기록의 기기 저장 접점(messenger-chat-1-5 spec §5.3).
// `lib/storage` 를 가짜로 바꾼다. 기기 구현은 모듈 안 캐시를 쥐므로 테스트마다 모듈을 다시 불러온다.

const storage = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => string | null>(),
  setItem: vi.fn<(key: string, value: string) => void>(),
}));
vi.mock("../../lib/storage", () => ({
  getItem: storage.getItem,
  setItem: storage.setItem,
  removeItem: vi.fn(),
  isStorageAvailable: () => true,
}));

async function freshStores() {
  vi.resetModules();
  return await import("./chat-local-stores");
}

beforeEach(() => {
  storage.getItem.mockReset();
  storage.setItem.mockReset();
  storage.getItem.mockReturnValue(null);
});
afterEach(() => {
  vi.resetModules();
});

describe("키 이름 (MC2-U24)", () => {
  test("MC2-U24. 키 이름은 libitum.messenger.* 로 고정이다", () => {
    expect(UNLOCKED_KEY).toBe("libitum.messenger.unlocked");
  });
});

describe("parseUnlocked (MC2-U24)", () => {
  test("MC2-U24. 문자열 배열은 그대로 통과한다", () => {
    expect(parseUnlocked(["mina"])).toEqual(["mina"]);
    expect(parseUnlocked(["mina", "clerk"])).toEqual(["mina", "clerk"]);
  });

  test("MC2-U24. 중복과 빈 문자열은 지운다", () => {
    expect(parseUnlocked(["mina", "mina"])).toEqual(["mina"]);
    expect(parseUnlocked(["", "mina", ""])).toEqual(["mina"]);
  });

  test("MC2-U24. 숫자가 섞인 배열은 문자열만 남긴다 — 값 하나 때문에 해금한 인물을 모두 잃지 않는다", () => {
    expect(parseUnlocked(["mina", 3, null])).toEqual(["mina"]);
    expect(parseUnlocked([{}, "clerk", "", "mina", "clerk"])).toEqual(["clerk", "mina"]);
  });

  test.each([
    ["객체", { mina: true }],
    ["null", null],
    ["undefined", undefined],
    ["문자열", "mina"],
    ["숫자", 3],
  ] as const)("MC2-U24. %s → 빈 배열이고 던지지 않는다", (_label, raw) => {
    expect(() => parseUnlocked(raw)).not.toThrow();
    expect(parseUnlocked(raw)).toEqual([]);
  });
});

describe("memoryUnlockStore (MC2-U24)", () => {
  test("MC2-U24. 처음 값을 읽고 add 가 더한다", () => {
    const store = memoryUnlockStore(["mina"]);
    expect([...store.read()]).toEqual(["mina"]);
    store.add("clerk");
    expect([...store.read()].sort()).toEqual(["clerk", "mina"]);
  });

  test("MC2-U24. 같은 id 를 두 번 더해도 한 번이다", () => {
    const store = memoryUnlockStore();
    store.add("mina");
    store.add("mina");
    expect([...store.read()]).toEqual(["mina"]);
  });

  test("MC2-U24. 저장소 둘은 서로 섞이지 않는다", () => {
    const a = memoryUnlockStore();
    const b = memoryUnlockStore();
    a.add("mina");
    expect(b.read().has("mina")).toBe(false);
  });
});

describe("deviceUnlockStore (MC2-U24)", () => {
  // 2026-11-17부터 계정마다 적습니다(UA-U1 ~ U5) — 여기서는 저장 모양 · 오류 처리만 봅니다.
  const A = "server:a";
  const map = (value: unknown) => JSON.stringify({ [A]: value });

  test("MC2-U24. 그 계정의 JSON 배열을 읽는다", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.getItem.mockImplementation((key) =>
      key === "libitum.messenger.unlocked-by-account" ? map(["mina"]) : null,
    );
    expect([...deviceUnlockStore(A).read()]).toEqual(["mina"]);
  });

  test("MC2-U24. add 는 키 libitum.messenger.unlocked-by-account 에 계정 칸을 쓰고 끝 줄바꿈이 없다", async () => {
    const { deviceUnlockStore } = await freshStores();
    deviceUnlockStore(A).add("mina");
    expect(storage.setItem).toHaveBeenCalled();
    const [key, value] = storage.setItem.mock.calls.at(-1) ?? [];
    expect(key).toBe("libitum.messenger.unlocked-by-account");
    expect(JSON.parse(value as string)).toEqual({ [A]: ["mina"] });
    expect(value).not.toMatch(/\s$/);
  });

  test("MC2-U24. 기존 기록에 더한다 — 중복 없이", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.getItem.mockImplementation((key) =>
      key === "libitum.messenger.unlocked-by-account" ? map(["mina"]) : null,
    );
    const unlocks = deviceUnlockStore(A);
    unlocks.add("clerk");
    unlocks.add("clerk");
    const [, value] = storage.setItem.mock.calls.at(-1) ?? [];
    expect(typeof value).toBe("string");
    expect((JSON.parse(value as string) as Record<string, string[]>)[A]?.sort()).toEqual([
      "clerk",
      "mina",
    ]);
  });

  test("MC2-U24. 읽기가 던지면 빈 집합이다", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.getItem.mockImplementation(() => {
      throw new Error("native module failed");
    });
    expect(() => deviceUnlockStore(A).read()).not.toThrow();
    expect(deviceUnlockStore(A).read().size).toBe(0);
  });

  test("MC2-U24. 쓰기가 던져도 삼키고 캐시로 계속한다", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    const unlocks = deviceUnlockStore(A);
    expect(() => unlocks.add("mina")).not.toThrow();
    expect(unlocks.read().has("mina")).toBe(true);
  });
});

// `unit` 계층(BY-U9): 생년의 기기 저장(ADR-0125) — 계정마다 따로, 틀린 값은 적힌 것 없음.
describe("생년 (BY-U9)", () => {
  test("BY-U9. 키 libitum.messenger.birth-year에 계정마다 적고, 다른 계정 값은 지우지 않는다", async () => {
    const { BIRTH_YEAR_KEY, deviceBirthYearStore } = await freshStores();
    expect(BIRTH_YEAR_KEY).toBe("libitum.messenger.birth-year");
    storage.getItem.mockReturnValue(JSON.stringify({ "server:b": { kind: "skipped" } }));
    deviceBirthYearStore("server:a").write({ kind: "set", year: 1995 });
    expect(storage.setItem).toHaveBeenCalledWith(
      "libitum.messenger.birth-year",
      JSON.stringify({ "server:b": { kind: "skipped" }, "server:a": { kind: "set", year: 1995 } }),
    );
    storage.getItem.mockReturnValue(
      JSON.stringify({ "server:a": { kind: "set", year: 1995 }, "server:b": { kind: "skipped" } }),
    );
    expect(deviceBirthYearStore("server:a").read()).toEqual({ kind: "set", year: 1995 });
    expect(deviceBirthYearStore("server:b").read()).toEqual({ kind: "skipped" });
    expect(deviceBirthYearStore("fixture").read()).toBeNull();
  });

  test("BY-U9. 틀린 값 · 읽기 실패는 null, unasked도 적힌 것 없음", async () => {
    const { deviceBirthYearStore, parseBirthYear } = await freshStores();
    expect(parseBirthYear({ kind: "set", year: 1995.5 })).toBeNull();
    expect(parseBirthYear({ kind: "set", year: "1995" })).toBeNull();
    expect(parseBirthYear({ kind: "unasked" })).toBeNull();
    expect(parseBirthYear("1995")).toBeNull();
    storage.getItem.mockImplementation(() => {
      throw new Error("native module failed");
    });
    expect(deviceBirthYearStore("server:a").read()).toBeNull();
  });
});

describe("휴대폰 키보드 높이 (KH-U2)", () => {
  test("KH-U2. 잰 높이를 기기에 적고 다음 실행(새 모듈)에서 읽는다 — 키는 계정이 아니라 기기 하나다", async () => {
    const { deviceKeyboardHeightStore, KEYBOARD_HEIGHT_KEY } = await freshStores();
    expect(KEYBOARD_HEIGHT_KEY).toBe("libitum.messenger.keyboard-height");
    expect(deviceKeyboardHeightStore.read()).toBeNull();
    deviceKeyboardHeightStore.write(336);
    expect(storage.setItem).toHaveBeenCalledWith(KEYBOARD_HEIGHT_KEY, "336");
    expect(deviceKeyboardHeightStore.read()).toBe(336);

    storage.getItem.mockReturnValue("312");
    const next = await freshStores();
    expect(next.deviceKeyboardHeightStore.read()).toBe(312);
  });

  test("KH-U2. 유한한 양수가 아닌 값 · 읽기 실패는 null이고, 0 이하는 적지 않는다", async () => {
    storage.getItem.mockReturnValue('"tall"');
    const { deviceKeyboardHeightStore } = await freshStores();
    expect(deviceKeyboardHeightStore.read()).toBeNull();
    deviceKeyboardHeightStore.write(0);
    deviceKeyboardHeightStore.write(Number.NaN);
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.getItem.mockImplementation(() => {
      throw new Error("native module failed");
    });
    const failing = await freshStores();
    expect(failing.deviceKeyboardHeightStore.read()).toBeNull();
  });
});
