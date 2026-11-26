import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey } from "../lib/auth-session";
import {
  CHAT_PUSH_ASK_GAP_MS,
  CHAT_PUSH_ASK_MAX,
  chatPushAskDecision,
  chatPushAskRecordFrom,
  chatPushAskShown,
  chatPushAskStorageKey,
  emptyChatPushAskRecord,
  readChatPushAsk,
  writeChatPushAsk,
  type ChatPushAskInput,
} from "./chat-push-ask";

// `unit` 계층: 채팅 첫 답장 뒤 알림 권한 카드의 판정 · 계정별 기록(ADR-0197 D2).

const NOW = 1_800_000_000_000;

describe("chatPushAskDecision", () => {
  const fresh: ChatPushAskInput = {
    signedIn: true,
    permission: "not-determined",
    record: emptyChatPushAskRecord,
    nowMs: NOW,
  };

  test("CPA-U1. 로그인 · 미결정 · 처음이면 카드를 세운다", () => {
    expect(chatPushAskDecision(fresh)).toBe("card");
  });

  test("CPA-U2. 손님(로그인 안 함)에게는 아무것도 없다 — 권한과 상관없이", () => {
    expect(chatPushAskDecision({ ...fresh, signedIn: false })).toBe("none");
    expect(chatPushAskDecision({ ...fresh, signedIn: false, permission: "authorized" })).toBe(
      "none",
    );
  });

  test.each(["authorized", "provisional"] as const)(
    "CPA-U3. 이미 허용(%s)이면 카드 없이 조용히 등록한다 — 기록이 다 찼어도",
    (permission) => {
      expect(chatPushAskDecision({ ...fresh, permission })).toBe("register");
      expect(
        chatPushAskDecision({
          ...fresh,
          permission,
          record: { shown: CHAT_PUSH_ASK_MAX, lastShownAtMs: NOW },
        }),
      ).toBe("register");
    },
  );

  test("CPA-U4. 이미 거절 · 권한 모름이면 카드가 없다", () => {
    expect(chatPushAskDecision({ ...fresh, permission: "denied" })).toBe("none");
    expect(chatPushAskDecision({ ...fresh, permission: null })).toBe("none");
  });

  test("CPA-U5. 한 번 보인 뒤 3일 안이면 없고, 3일이 지나면 한 번 더", () => {
    const once = { shown: 1, lastShownAtMs: NOW };
    expect(chatPushAskDecision({ ...fresh, record: once, nowMs: NOW + 1 })).toBe("none");
    expect(
      chatPushAskDecision({ ...fresh, record: once, nowMs: NOW + CHAT_PUSH_ASK_GAP_MS - 1 }),
    ).toBe("none");
    expect(chatPushAskDecision({ ...fresh, record: once, nowMs: NOW + CHAT_PUSH_ASK_GAP_MS })).toBe(
      "card",
    );
  });

  test("CPA-U6. 최대 2번 — 두 번 보였으면 몇 날이 지나도 없다", () => {
    expect(CHAT_PUSH_ASK_MAX).toBe(2);
    expect(CHAT_PUSH_ASK_GAP_MS).toBe(259_200_000);
    expect(
      chatPushAskDecision({
        ...fresh,
        record: { shown: 2, lastShownAtMs: NOW },
        nowMs: NOW + 30 * CHAT_PUSH_ASK_GAP_MS,
      }),
    ).toBe("none");
  });

  test("CPA-U7. 기기 시계가 뒤로 갔으면(마지막이 미래) 간격 안으로 본다", () => {
    expect(
      chatPushAskDecision({ ...fresh, record: { shown: 1, lastShownAtMs: NOW }, nowMs: NOW - 1 }),
    ).toBe("none");
  });
});

describe("기록 모양", () => {
  test("CPA-U8. 읽기는 모양이 틀리면 빈 기록, 보인 뒤에는 횟수 +1 · 시각", () => {
    expect(chatPushAskRecordFrom(null)).toEqual(emptyChatPushAskRecord);
    expect(chatPushAskRecordFrom("")).toEqual(emptyChatPushAskRecord);
    expect(chatPushAskRecordFrom("{oops")).toEqual(emptyChatPushAskRecord);
    expect(chatPushAskRecordFrom('{"shown":"2"}')).toEqual(emptyChatPushAskRecord);
    expect(chatPushAskRecordFrom('{"shown":-1,"lastShownAtMs":5}')).toEqual(emptyChatPushAskRecord);
    expect(chatPushAskRecordFrom('{"shown":1,"lastShownAtMs":5}')).toEqual({
      shown: 1,
      lastShownAtMs: 5,
    });
    expect(chatPushAskRecordFrom('{"shown":1,"lastShownAtMs":"x"}')).toEqual({
      shown: 1,
      lastShownAtMs: null,
    });
    expect(chatPushAskShown(emptyChatPushAskRecord, NOW)).toEqual({
      shown: 1,
      lastShownAtMs: NOW,
    });
    expect(chatPushAskShown({ shown: 1, lastShownAtMs: 5 }, NOW)).toEqual({
      shown: 2,
      lastShownAtMs: NOW,
    });
  });
});

describe("계정 · 기기 저장", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    store.set(authSessionStorageKey, "unused");
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: (key: string) => store.get(key) ?? null,
        set: (key: string, value: string) => void store.set(key, value),
        remove: (key: string) => void store.delete(key),
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  test("CPA-U9. 계정마다 키 `libitum.chat-push-ask.<id>`에 적고 읽는다 — 다른 계정은 빈 기록", () => {
    expect(chatPushAskStorageKey("u1")).toBe("libitum.chat-push-ask.u1");
    writeChatPushAsk("u1", { shown: 1, lastShownAtMs: NOW });
    expect(JSON.parse(store.get("libitum.chat-push-ask.u1") ?? "null")).toEqual({
      shown: 1,
      lastShownAtMs: NOW,
    });
    expect(readChatPushAsk("u1")).toEqual({ shown: 1, lastShownAtMs: NOW });
    expect(readChatPushAsk("u2")).toEqual(emptyChatPushAskRecord);
  });

  test("CPA-U10. 저장소가 던져도 읽기는 빈 기록, 쓰기는 조용하다", () => {
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: () => {
          throw new Error("boom");
        },
        set: () => {
          throw new Error("boom");
        },
        remove: () => undefined,
      },
    });
    expect(readChatPushAsk("u1")).toEqual(emptyChatPushAskRecord);
    expect(() => writeChatPushAsk("u1", { shown: 1, lastShownAtMs: NOW })).not.toThrow();
  });
});
