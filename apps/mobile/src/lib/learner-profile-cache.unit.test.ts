import { afterEach, describe, expect, test, vi } from "vitest";

import {
  clearGuestLearnerProfile,
  clearLearnerProfileCache,
  guestLearnerProfileKey,
  learnerProfileCacheEntryFrom,
  learnerProfileCacheKey,
  readGuestLearnerProfile,
  readLearnerProfileCache,
  writeGuestLearnerProfile,
  writeLearnerProfileCache,
} from "./learner-profile-cache";

// `unit` 계층: 캐시 칸의 디코드와 키, 저장소 대역에 대한 읽기 · 쓰기 · 지우기의 입출력만 봅니다.

const emma = { name: "Emma", countryCode: "DE" } as const;
const liam = { name: "Liam", countryCode: "FR" } as const;

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("키", () => {
  test("PC-1. 사용자별 키에는 사용자 id가 들고 손님 키는 상수다", () => {
    expect(learnerProfileCacheKey("u1")).toBe("libitum.learner-profile.u1");
    expect(learnerProfileCacheKey("u2")).toBe("libitum.learner-profile.u2");
    expect(guestLearnerProfileKey).toBe("libitum.learner-profile.guest");
  });
});

describe("learnerProfileCacheEntryFrom", () => {
  test.each(["pending", "synced"] as const)("PC-2. 올바른 v1 칸은 디코드된다: %s", (sync) => {
    expect(learnerProfileCacheEntryFrom({ v: 1, name: "Emma", countryCode: "DE", sync })).toEqual({
      record: emma,
      sync,
    });
  });

  test("PC-2. 이름은 정규화되어 나온다", () => {
    expect(
      learnerProfileCacheEntryFrom({ v: 1, name: " Emma ", countryCode: "DE", sync: "synced" }),
    ).toEqual({ record: emma, sync: "synced" });
  });

  test.each([
    ["다른 버전", { v: 2, name: "Emma", countryCode: "DE", sync: "synced" }],
    ["버전 없음", { name: "Emma", countryCode: "DE", sync: "synced" }],
    ["모르는 sync", { v: 1, name: "Emma", countryCode: "DE", sync: "done" }],
    ["sync 없음", { v: 1, name: "Emma", countryCode: "DE" }],
    ["이름만", { v: 1, name: "Emma", countryCode: null, sync: "synced" }],
    ["나라만", { v: 1, name: null, countryCode: "DE", sync: "synced" }],
    ["둘 다 null", { v: 1, name: null, countryCode: null, sync: "synced" }],
    ["이름 규칙 위반", { v: 1, name: "{x}", countryCode: "DE", sync: "synced" }],
    ["코드 형식 위반", { v: 1, name: "Emma", countryCode: "de", sync: "synced" }],
    ["문자열", "libitum"],
    ["숫자", 1],
    ["null", null],
    ["undefined", undefined],
    ["배열", []],
  ])("PC-2. 칸이 아니다 -> null: %s", (_label, raw) => {
    expect(learnerProfileCacheEntryFrom(raw)).toBeNull();
  });
});

describe("읽기 · 쓰기 · 지우기", () => {
  test("PC-3. 사용자 칸은 쓴 값을 그대로 읽고 v1 모양으로 저장된다", () => {
    const store = installStorage();

    writeLearnerProfileCache("u1", { record: emma, sync: "pending" });

    expect(readLearnerProfileCache("u1")).toEqual({ record: emma, sync: "pending" });
    expect(JSON.parse(store.get("libitum.learner-profile.u1") ?? "null")).toEqual({
      v: 1,
      name: "Emma",
      countryCode: "DE",
      sync: "pending",
    });
  });

  test("PC-3. 다시 쓰면 덮고 지우면 없어진다", () => {
    const store = installStorage();
    writeLearnerProfileCache("u1", { record: emma, sync: "pending" });

    writeLearnerProfileCache("u1", { record: liam, sync: "synced" });
    expect(readLearnerProfileCache("u1")).toEqual({ record: liam, sync: "synced" });

    clearLearnerProfileCache("u1");
    expect(readLearnerProfileCache("u1")).toBeNull();
    expect(store.has("libitum.learner-profile.u1")).toBe(false);
  });

  test("PC-3. 손님 칸도 쓰고 읽고 지운다 — sync 필드는 없다", () => {
    const store = installStorage();
    expect(readGuestLearnerProfile()).toBeNull();

    writeGuestLearnerProfile(emma);

    expect(readGuestLearnerProfile()).toEqual(emma);
    expect(JSON.parse(store.get("libitum.learner-profile.guest") ?? "null")).toEqual({
      v: 1,
      name: "Emma",
      countryCode: "DE",
    });

    clearGuestLearnerProfile();
    expect(readGuestLearnerProfile()).toBeNull();
    expect(store.has("libitum.learner-profile.guest")).toBe(false);
  });

  test("PC-4. 깨진 JSON · 규칙 위반 값은 없는 것으로 읽는다", () => {
    const store = installStorage();

    store.set("libitum.learner-profile.u1", "{not json");
    store.set("libitum.learner-profile.guest", "{not json");
    expect(readLearnerProfileCache("u1")).toBeNull();
    expect(readGuestLearnerProfile()).toBeNull();

    store.set(
      "libitum.learner-profile.u1",
      JSON.stringify({ v: 1, name: "{x}", countryCode: "DE", sync: "synced" }),
    );
    store.set("libitum.learner-profile.guest", JSON.stringify({ v: 9, name: "Emma" }));
    expect(readLearnerProfileCache("u1")).toBeNull();
    expect(readGuestLearnerProfile()).toBeNull();
  });

  test("PC-4. 저장소가 없으면 읽기는 null이고 쓰기 · 지우기는 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", undefined);

    expect(readLearnerProfileCache("u1")).toBeNull();
    expect(readGuestLearnerProfile()).toBeNull();
    expect(() => writeLearnerProfileCache("u1", { record: emma, sync: "pending" })).not.toThrow();
    expect(() => clearLearnerProfileCache("u1")).not.toThrow();
    expect(() => writeGuestLearnerProfile(emma)).not.toThrow();
    expect(() => clearGuestLearnerProfile()).not.toThrow();
  });

  test("PC-5. 사용자 A의 쓰기가 사용자 B의 읽기에 보이지 않는다", () => {
    installStorage();

    writeLearnerProfileCache("a", { record: emma, sync: "synced" });

    expect(readLearnerProfileCache("b")).toBeNull();
    writeLearnerProfileCache("b", { record: liam, sync: "pending" });
    expect(readLearnerProfileCache("a")).toEqual({ record: emma, sync: "synced" });
    expect(readLearnerProfileCache("b")).toEqual({ record: liam, sync: "pending" });
    clearLearnerProfileCache("a");
    expect(readLearnerProfileCache("b")).toEqual({ record: liam, sync: "pending" });
  });
});
