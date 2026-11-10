import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  TURN_RECORD_KEY,
  UNLOCKED_KEY,
  memoryUnlockStore,
  parseUnlocked,
} from "./chat-local-stores";

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
    expect(TURN_RECORD_KEY).toBe("libitum.messenger.free-turns");
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

  test("MC2-U24. 숫자가 섞인 배열에서 문자열이 아닌 값은 결과에 들어가지 않는다", () => {
    const result = parseUnlocked(["mina", 3, null]);
    for (const id of result) {
      expect(typeof id).toBe("string");
      expect(id).not.toBe("");
    }
    expect(result).not.toContain(3 as unknown as string);
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

describe("deviceTurnRecordStore (MC2-U24)", () => {
  test("MC2-U24. 저장된 JSON 을 읽는다", async () => {
    const { deviceTurnRecordStore } = await freshStores();
    storage.getItem.mockImplementation((key) =>
      key === "libitum.messenger.free-turns"
        ? JSON.stringify({ day: "2026-11-10", used: 2, outPanel: "due" })
        : null,
    );
    expect(deviceTurnRecordStore.read()).toEqual({ day: "2026-11-10", used: 2, outPanel: "due" });
  });

  test("MC2-U24. 쓰기는 JSON 이고 키가 맞으며 끝 줄바꿈이 없다", async () => {
    const { deviceTurnRecordStore } = await freshStores();
    const record = { day: "2026-11-10", used: 1, outPanel: "shown" } as const;
    deviceTurnRecordStore.write(record);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const [key, value] = storage.setItem.mock.calls[0] ?? [];
    expect(key).toBe("libitum.messenger.free-turns");
    expect(JSON.parse(value as string)).toEqual(record);
    expect(value).not.toMatch(/\s$/);
  });

  test("MC2-U24. JSON 왕복 — 쓴 값을 다시 읽으면 같다", async () => {
    const { deviceTurnRecordStore } = await freshStores();
    const record = { day: "2026-11-10", used: 3, outPanel: "shown" } as const;
    deviceTurnRecordStore.write(record);
    expect(deviceTurnRecordStore.read()).toEqual(record);
  });

  test("MC2-U24. 읽기가 던지면 null 이다", async () => {
    const { deviceTurnRecordStore } = await freshStores();
    storage.getItem.mockImplementation(() => {
      throw new Error("native module failed");
    });
    expect(() => deviceTurnRecordStore.read()).not.toThrow();
    expect(deviceTurnRecordStore.read()).toBeNull();
  });

  test("MC2-U24. 저장된 값이 JSON 이 아니거나 모양이 틀리면 null 이다", async () => {
    const { deviceTurnRecordStore } = await freshStores();
    storage.getItem.mockReturnValue("{not json");
    expect(deviceTurnRecordStore.read()).toBeNull();
    storage.getItem.mockReturnValue(JSON.stringify({ day: "x", used: -1, outPanel: "?" }));
    expect(deviceTurnRecordStore.read()).toBeNull();
  });

  test("MC2-U24. 쓰기가 던져도 삼키고, 이번 실행은 캐시로 계속 읽는다", async () => {
    const { deviceTurnRecordStore } = await freshStores();
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    const record = { day: "2026-11-10", used: 2, outPanel: "due" } as const;
    expect(() => deviceTurnRecordStore.write(record)).not.toThrow();
    storage.getItem.mockReturnValue(null);
    expect(deviceTurnRecordStore.read()).toEqual(record);
  });

  test("MC2-U24. 첫 읽기 뒤에는 캐시로 읽는다 — 저장소를 다시 부르지 않는다", async () => {
    const { deviceTurnRecordStore } = await freshStores();
    storage.getItem.mockReturnValue(
      JSON.stringify({ day: "2026-11-10", used: 1, outPanel: "due" }),
    );
    deviceTurnRecordStore.read();
    deviceTurnRecordStore.read();
    deviceTurnRecordStore.read();
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });
});

describe("deviceUnlockStore (MC2-U24)", () => {
  test("MC2-U24. 저장된 JSON 배열을 읽는다", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.getItem.mockImplementation((key) =>
      key === "libitum.messenger.unlocked" ? JSON.stringify(["mina"]) : null,
    );
    expect([...deviceUnlockStore.read()]).toEqual(["mina"]);
  });

  test("MC2-U24. add 는 키 libitum.messenger.unlocked 에 JSON 배열을 쓰고 끝 줄바꿈이 없다", async () => {
    const { deviceUnlockStore } = await freshStores();
    deviceUnlockStore.add("mina");
    expect(storage.setItem).toHaveBeenCalled();
    const [key, value] = storage.setItem.mock.calls.at(-1) ?? [];
    expect(key).toBe("libitum.messenger.unlocked");
    expect(JSON.parse(value as string)).toEqual(["mina"]);
    expect(value).not.toMatch(/\s$/);
  });

  test("MC2-U24. 기존 기록에 더한다 — 중복 없이", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.getItem.mockReturnValue(JSON.stringify(["mina"]));
    deviceUnlockStore.add("clerk");
    deviceUnlockStore.add("clerk");
    expect(storage.setItem).toHaveBeenCalled();
    const [, value] = storage.setItem.mock.calls.at(-1) ?? [];
    expect(typeof value).toBe("string");
    expect((JSON.parse(value as string) as string[]).sort()).toEqual(["clerk", "mina"]);
  });

  test("MC2-U24. 읽기가 던지면 빈 집합이다", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.getItem.mockImplementation(() => {
      throw new Error("native module failed");
    });
    expect(() => deviceUnlockStore.read()).not.toThrow();
    expect(deviceUnlockStore.read().size).toBe(0);
  });

  test("MC2-U24. 쓰기가 던져도 삼키고 캐시로 계속한다", async () => {
    const { deviceUnlockStore } = await freshStores();
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => deviceUnlockStore.add("mina")).not.toThrow();
    expect(deviceUnlockStore.read().has("mina")).toBe(true);
  });
});
