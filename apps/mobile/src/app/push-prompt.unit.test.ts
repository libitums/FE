import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey } from "../lib/auth-session";
import {
  clearPushPrompt,
  isPushPromptPending,
  leftStory,
  markPushPromptPending,
  pushPromptDue,
  pushPromptStorageKey,
  type PushPromptInput,
} from "./push-prompt";

// `unit` 계층: 알림 권한을 첫 스토리 뒤에 묻는 판정 · 계정별 표식(ADR-0176).

describe("pushPromptDue", () => {
  const afterStory: PushPromptInput = {
    signedIn: true,
    pending: true,
    idle: true,
    storyLeft: true,
    activityCount: 0,
  };

  test("PP1. 새 가입자가 스토리를 나와 한가한 지도에 서면 묻는다", () => {
    expect(pushPromptDue(afterStory)).toBe(true);
  });

  test("PP2. 끝낸 기록이 있으면 이 실행에서 스토리를 보지 않았어도 묻는다(재실행)", () => {
    expect(pushPromptDue({ ...afterStory, storyLeft: false, activityCount: 1 })).toBe(true);
  });

  test.each<[string, Partial<PushPromptInput>]>([
    ["스토리 전(가이드가 서 있다)", { storyLeft: false }],
    ["표식 없음(기존 계정 · 이미 물음)", { pending: false }],
    ["손님", { signedIn: false }],
    ["다른 안내 · 다른 화면", { idle: false }],
  ])("PP3. %s이면 묻지 않는다", (_name, change) => {
    expect(pushPromptDue(afterStory)).toBe(true);
    expect(pushPromptDue({ ...afterStory, ...change })).toBe(false);
  });
});

describe("leftStory", () => {
  test("PP4. 표지 스토리에서 다른 화면으로 나온 순간만이다", () => {
    expect(leftStory("catalog-cover", "journey-map")).toBe(true);
    expect(leftStory("catalog-cover", "catalog-cover")).toBe(false);
    expect(leftStory("journey-map", "catalog-cover")).toBe(false);
    expect(leftStory("entry-basics-ready", "journey-map")).toBe(false);
  });
});

describe("기기 표식", () => {
  let store: Map<string, string>;
  const signInAs = (userId: string) =>
    void store.set(
      authSessionStorageKey,
      JSON.stringify({
        accessToken: `e30.${btoa(JSON.stringify({ sub: userId }))}.sig`,
        refreshToken: "refresh",
        expiresAt: 9_999_999_999,
      }),
    );

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
  afterEach(() => void vi.unstubAllGlobals());

  test("PP5. 키는 계정마다 따로다", () => {
    expect(pushPromptStorageKey("u1")).toBe("libitum.push-prompt.u1");
  });

  test("PP6. 적은 계정만 기다리고, 지우면 끝난다", () => {
    signInAs("u1");
    markPushPromptPending();
    expect(isPushPromptPending()).toBe(true);

    signInAs("u2");
    expect(isPushPromptPending()).toBe(false);

    signInAs("u1");
    clearPushPrompt("u1");
    expect(isPushPromptPending()).toBe(false);
  });

  test("PP7. 저장값 끝에 공백이 붙어 돌아와도 읽는다(Android)", () => {
    signInAs("u1");
    store.set("libitum.push-prompt.u1", "pending\n    ");
    expect(isPushPromptPending()).toBe(true);
  });

  test("PP8. 로그인이 없으면 쓰지 않는다", () => {
    markPushPromptPending();
    expect([...store.keys()]).toEqual([]);
  });

  test("PP9. 저장소가 던져도 던지지 않는다", () => {
    signInAs("u1");
    const session = store.get(authSessionStorageKey);
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: (key: string) => {
          if (key === authSessionStorageKey) return session;
          throw new Error("storage");
        },
        set: () => {
          throw new Error("storage");
        },
        remove: () => {
          throw new Error("storage");
        },
      },
    });
    expect(() => markPushPromptPending()).not.toThrow();
    expect(() => clearPushPrompt("u1")).not.toThrow();
    expect(isPushPromptPending()).toBe(false);
  });
});
