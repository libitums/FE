import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "./auth-session";
import {
  adoptGuestGuides,
  currentGuideOwner,
  forgetGuideRecords,
  guideOwnerFrom,
  guideRecordKey,
  legacyGuideKeys,
  mergedGuideRecord,
  readGuideRecord,
  writeGuideRecord,
} from "./guide-records";
import { guestSessionStorageKey } from "./guest-session";
import { learningItemGuideSeenStorageKey } from "./learning-item-guide";

// `unit` 계층(GR-U1 ~ U6): 안내 기록을 계정별 키로(사용자 결정 2026-11-27). 키 계산 · 옛 기기 기록의 이전 1회 · 비회원 → 계정
// 이어받기 · 계정 삭제. 대역은 `StorageModule` 하나.

const TOKEN_A = "e30.eyJzdWIiOiJ1c2VyLWEifQ.sig";
const session = (accessToken: string) => ({
  accessToken,
  refreshToken: "r",
  expiresAt: 4_102_444_800_000,
});

const GUIDE = "libitum.messenger.guide-seen";
const KEYBOARD = "libitum.messenger.keyboard-guide-seen";
const TAB = "libitum.messenger.tab-visited";
const ITEMS = "libitum.learning-item-guides.seen";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("키 계산", () => {
  test("GR-U1 계정은 토큰의 사용자 id, 비회원은 guest, 둘 다 없거나 id를 못 읽으면 없음", () => {
    expect(guideOwnerFrom(session(TOKEN_A), false)).toBe("user-a");
    expect(guideOwnerFrom(session(TOKEN_A), true)).toBe("user-a");
    expect(guideOwnerFrom(null, true)).toBe("guest");
    expect(guideOwnerFrom(null, false)).toBeNull();
    expect(guideOwnerFrom(session("not-a-jwt"), false)).toBeNull();
  });

  test("GR-U1 기록 키는 옛 기기 키 뒤에 .<계정> — 가입 보상 `libitum.signup-reward.<uid>`와 같은 꼴", () => {
    expect(guideRecordKey(GUIDE, "user-a")).toBe("libitum.messenger.guide-seen.user-a");
    expect(guideRecordKey(ITEMS, "guest")).toBe("libitum.learning-item-guides.seen.guest");
    expect([...legacyGuideKeys].sort()).toEqual([GUIDE, KEYBOARD, TAB, ITEMS].sort());
    expect(learningItemGuideSeenStorageKey).toBe(ITEMS);
  });

  test("GR-U1 지금 계정은 저장된 세션 · 비회원 표식에서 읽는다", () => {
    expect(currentGuideOwner()).toBeNull();
    store.set(guestSessionStorageKey, "1");
    expect(currentGuideOwner()).toBe("guest");
    store.set(authSessionStorageKey, serializeAuthSession(session(TOKEN_A)));
    expect(currentGuideOwner()).toBe("user-a");
  });
});

describe("옛 기기 기록의 이전", () => {
  test("GR-U2 처음 읽는 계정이 옛 기록 넷을 한꺼번에 물려받고 옛 키는 지운다", () => {
    store.set(GUIDE, '["list","room"]');
    store.set(KEYBOARD, "1");
    store.set(TAB, "1");
    store.set(ITEMS, '["sentence-order"]');
    expect(readGuideRecord(TAB, "user-a")).toBe("1");
    expect(store.get(`${GUIDE}.user-a`)).toBe('["list","room"]');
    expect(store.get(`${KEYBOARD}.user-a`)).toBe("1");
    expect(store.get(`${TAB}.user-a`)).toBe("1");
    expect(store.get(`${ITEMS}.user-a`)).toBe('["sentence-order"]');
    for (const key of [GUIDE, KEYBOARD, TAB, ITEMS]) expect(store.has(key)).toBe(false);
  });

  test("GR-U2 이전은 한 번 — 다른 계정은 처음부터(물려받을 옛 기록이 없다)", () => {
    store.set(GUIDE, '["list"]');
    readGuideRecord(GUIDE, "user-a");
    expect(readGuideRecord(GUIDE, "user-b")).toBeNull();
    expect(readGuideRecord(GUIDE, "user-a")).toBe('["list"]');
  });

  test("GR-U2 쓰기 먼저여도 옛 기록을 잃지 않는다 — 이미 계정 칸이 있으면 합친다", () => {
    store.set(GUIDE, '["list"]');
    store.set(`${GUIDE}.user-a`, '["room"]');
    writeGuideRecord(KEYBOARD, "user-a", "1");
    expect(JSON.parse(store.get(`${GUIDE}.user-a`) ?? "null")).toEqual(["room", "list"]);
    expect(store.get(`${KEYBOARD}.user-a`)).toBe("1");
    expect(store.has(GUIDE)).toBe(false);
  });
});

describe("합치기", () => {
  test("GR-U3 배열은 합집합(계정 쪽 순서 먼저), 표식은 어느 한쪽이 1이면 1, 한쪽만 있으면 그쪽", () => {
    expect(mergedGuideRecord('["list"]', '["room","list"]')).toBe('["list","room"]');
    expect(mergedGuideRecord("1", null)).toBe("1");
    expect(mergedGuideRecord(null, "1")).toBe("1");
    expect(mergedGuideRecord(null, null)).toBeNull();
    expect(mergedGuideRecord("broken", '["list"]')).toBe('["list"]');
  });
});

describe("비회원 → 계정", () => {
  test("GR-U4 가입하면 비회원 칸을 새 계정 칸으로 옮기고 비회원 칸을 지운다", () => {
    store.set(`${ITEMS}.guest`, '["activity-listening"]');
    store.set(`${GUIDE}.guest`, '["list"]');
    store.set(`${TAB}.guest`, "1");
    store.set(`${ITEMS}.user-a`, '["sentence-order"]');
    adoptGuestGuides("user-a");
    expect(JSON.parse(store.get(`${ITEMS}.user-a`) ?? "null")).toEqual([
      "sentence-order",
      "activity-listening",
    ]);
    expect(store.get(`${GUIDE}.user-a`)).toBe('["list"]');
    expect(store.get(`${TAB}.user-a`)).toBe("1");
    expect([...store.keys()].some((key) => key.endsWith(".guest"))).toBe(false);
  });
});

describe("계정 삭제", () => {
  test("GR-U5 그 계정 칸만 지운다 — 다른 계정 · 비회원 칸은 그대로, 남은 옛 기록도 지운다", () => {
    for (const key of [GUIDE, KEYBOARD, TAB, ITEMS]) {
      store.set(`${key}.user-a`, "1");
      store.set(`${key}.user-b`, "1");
    }
    store.set(`${ITEMS}.guest`, "1");
    store.set(TAB, "1");
    forgetGuideRecords("user-a");
    for (const key of [GUIDE, KEYBOARD, TAB, ITEMS]) {
      expect(store.has(`${key}.user-a`)).toBe(false);
      expect(store.get(`${key}.user-b`)).toBe("1");
    }
    expect(store.get(`${ITEMS}.guest`)).toBe("1");
    expect(store.has(TAB)).toBe(false);
  });
});

test("GR-U6 저장소가 던져도 던지지 않는다", () => {
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: () => {
        throw new Error("read failed");
      },
      set: () => {
        throw new Error("write failed");
      },
      remove: () => {
        throw new Error("remove failed");
      },
    },
  });
  expect(currentGuideOwner()).toBeNull();
  expect(() => adoptGuestGuides("user-a")).not.toThrow();
  expect(() => forgetGuideRecords("user-a")).not.toThrow();
});
