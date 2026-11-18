import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AppVersion } from "./app-version";
import { authSessionStorageKey, serializeAuthSession } from "./auth-session";
import {
  roleplayTurnLogBatchOf,
  roleplayTurnLogOsVersion,
  submitRoleplayTurnLog,
} from "./roleplay-turn-log-api";
import type { RoleplayTurnLogEntry } from "../screens/roleplay-story/roleplay-story.contract";

// `unit` 계층: 턴 로그 묶음 만들기와 서버 호출(ADR-0161). 대역은 경계뿐 — `StorageModule` · `fetch` · `SystemInfo`.

const android: AppVersion = { platform: "android", name: "1.5.0", build: 17 };

const heard = (over: Partial<RoleplayTurnLogEntry> = {}): RoleplayTurnLogEntry => ({
  turnIndex: 0,
  attempt: 1,
  outcome: "heard",
  reason: null,
  heard: "카드로 할게요",
  verdict: "correct",
  hintShown: false,
  ...over,
});
const unavailable: RoleplayTurnLogEntry = {
  turnIndex: 1,
  attempt: 1,
  outcome: "unavailable",
  reason: "blocked",
  heard: null,
  verdict: null,
  hintShown: true,
};
const skipped: RoleplayTurnLogEntry = {
  turnIndex: 1,
  attempt: 2,
  outcome: "skipped",
  reason: null,
  heard: null,
  verdict: null,
  hintShown: true,
};

function install(options: { signedIn?: boolean; status?: number; fail?: boolean } = {}) {
  const store = new Map<string, string>();
  if (options.signedIn !== false) {
    store.set(
      authSessionStorageKey,
      serializeAuthSession({
        accessToken: "access",
        refreshToken: "r",
        expiresAt: 4_102_444_800_000,
      }),
    );
  }
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  const calls: { url: string; body: string }[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string }) => {
    calls.push({ url, body: init.body });
    if (options.fail === true) return Promise.reject(new Error("offline"));
    return Promise.resolve({ status: options.status ?? 200, text: async () => "1" });
  });
  return { calls };
}

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TLA1 roleplayTurnLogBatchOf", () => {
  test("에피소드 · 모드 · 플랫폼 · 버전 · 언어 · 운영체제 버전과 줄을 싣는다", () => {
    const batch = roleplayTurnLogBatchOf(
      { episodeId: "u06-cafe", log: [heard(), unavailable, skipped], appVersion: android },
      "en",
      "15",
    );
    expect(batch).toEqual({
      episodeId: "u06-cafe",
      mode: "scripted",
      platform: "android",
      appVersion: "1.5.0",
      appBuild: 17,
      uiLanguage: "en",
      osVersion: "15",
      turns: [
        {
          turnIndex: 0,
          attempt: 1,
          outcome: "heard",
          reason: null,
          heard: "카드로 할게요",
          verdict: "correct",
          hintShown: false,
        },
        {
          turnIndex: 1,
          attempt: 1,
          outcome: "unavailable",
          reason: "blocked",
          heard: null,
          verdict: null,
          hintShown: true,
        },
        {
          turnIndex: 1,
          attempt: 2,
          outcome: "skipped",
          reason: null,
          heard: null,
          verdict: null,
          hintShown: true,
        },
      ],
    });
  });

  test("인식된 글자는 200자에서 자르고, 빈 글자는 그대로 둔다", () => {
    const batch = roleplayTurnLogBatchOf(
      {
        episodeId: "u06-cafe",
        log: [heard({ heard: "가".repeat(250) }), heard({ attempt: 2, heard: "" })],
        appVersion: android,
      },
      "en",
      null,
    );
    expect(batch?.turns[0]?.heard).toBe("가".repeat(200));
    expect(batch?.turns[1]?.heard).toBe("");
    expect(batch?.osVersion).toBeNull();
  });

  test("들은 줄이 아니면 글자 · 판정을, 들을 수 없음이 아니면 까닭을 싣지 않는다", () => {
    const batch = roleplayTurnLogBatchOf(
      {
        episodeId: "u06-cafe",
        log: [
          { ...skipped, heard: "네", verdict: "correct", reason: "failed" },
          { ...heard(), reason: "failed" },
        ],
        appVersion: android,
      },
      "en",
      null,
    );
    expect(batch?.turns[0]).toMatchObject({ heard: null, verdict: null, reason: null });
    expect(batch?.turns[1]).toMatchObject({ heard: "카드로 할게요", reason: null });
  });

  test("줄은 앞에서부터 200개만 보낸다", () => {
    const log = Array.from({ length: 230 }, (_, index) => heard({ turnIndex: index }));
    const batch = roleplayTurnLogBatchOf(
      { episodeId: "u06-cafe", log, appVersion: android },
      "en",
      null,
    );
    expect(batch?.turns).toHaveLength(200);
    expect(batch?.turns[199]?.turnIndex).toBe(199);
  });

  test("줄이 없거나 앱 버전 · 에피소드를 모르면 보내지 않는다(null)", () => {
    expect(
      roleplayTurnLogBatchOf({ episodeId: "u06-cafe", log: [], appVersion: android }, "en", null),
    ).toBeNull();
    expect(
      roleplayTurnLogBatchOf(
        { episodeId: "u06-cafe", log: [heard()], appVersion: null },
        "en",
        null,
      ),
    ).toBeNull();
    expect(
      roleplayTurnLogBatchOf({ episodeId: "", log: [heard()], appVersion: android }, "en", null),
    ).toBeNull();
  });
});

describe("TLA2 roleplayTurnLogOsVersion", () => {
  test("Lynx의 SystemInfo.osVersion을 읽고, 없거나 글자가 아니면 null", () => {
    vi.stubGlobal("SystemInfo", undefined);
    expect(roleplayTurnLogOsVersion()).toBeNull();
    vi.stubGlobal("SystemInfo", {});
    expect(roleplayTurnLogOsVersion()).toBeNull();
    vi.stubGlobal("SystemInfo", { osVersion: " 18.1 " });
    expect(roleplayTurnLogOsVersion()).toBe("18.1");
    vi.stubGlobal("SystemInfo", { osVersion: 18 });
    expect(roleplayTurnLogOsVersion()).toBeNull();
    vi.stubGlobal("SystemInfo", { osVersion: "9".repeat(40) });
    expect(roleplayTurnLogOsVersion()).toBe("9".repeat(32));
  });
});

describe("TLA3 submitRoleplayTurnLog", () => {
  test("로그인한 사용자로 RPC 하나에 묶음을 싣는다", async () => {
    const { calls } = install();
    vi.stubGlobal("SystemInfo", { osVersion: "15" });
    await expect(
      submitRoleplayTurnLog({ episodeId: "u06-cafe", log: [heard()], appVersion: android }),
    ).resolves.toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://test.supabase.co/rest/v1/rpc/log_roleplay_turns");
    expect(JSON.parse(calls[0]!.body)).toEqual({
      p_batch: {
        episodeId: "u06-cafe",
        mode: "scripted",
        platform: "android",
        appVersion: "1.5.0",
        appBuild: 17,
        uiLanguage: "en",
        osVersion: "15",
        turns: [
          {
            turnIndex: 0,
            attempt: 1,
            outcome: "heard",
            reason: null,
            heard: "카드로 할게요",
            verdict: "correct",
            hintShown: false,
          },
        ],
      },
    });
  });

  test("로그인이 없으면 요청하지 않는다", async () => {
    const { calls } = install({ signedIn: false });
    await expect(
      submitRoleplayTurnLog({ episodeId: "u06-cafe", log: [heard()], appVersion: android }),
    ).resolves.toBe(false);
    expect(calls).toEqual([]);
  });

  test("보낼 것이 없으면 요청하지 않는다", async () => {
    const { calls } = install();
    await expect(
      submitRoleplayTurnLog({ episodeId: "u06-cafe", log: [], appVersion: android }),
    ).resolves.toBe(false);
    await expect(
      submitRoleplayTurnLog({ episodeId: "u06-cafe", log: [heard()], appVersion: null }),
    ).resolves.toBe(false);
    expect(calls).toEqual([]);
  });

  test("서버 거절 · 연결 실패는 던지지 않고 false — 다시 보내지 않는다", async () => {
    const rejected = install({ status: 500 });
    await expect(
      submitRoleplayTurnLog({ episodeId: "u06-cafe", log: [heard()], appVersion: android }),
    ).resolves.toBe(false);
    expect(rejected.calls).toHaveLength(1);
    const offline = install({ fail: true });
    await expect(
      submitRoleplayTurnLog({ episodeId: "u06-cafe", log: [heard()], appVersion: android }),
    ).resolves.toBe(false);
    expect(offline.calls.length).toBeGreaterThan(0);
  });
});
