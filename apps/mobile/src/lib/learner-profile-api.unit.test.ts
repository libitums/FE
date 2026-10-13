import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "./auth-session";
import { loadLearnerProfile, saveLearnerProfile } from "./learner-profile-api";

// `unit` 계층: 두 RPC의 요청 모양과 응답 접기만 봅니다 — fetch · 세션은 대역입니다.

type Call = { url: string; body: string; headers: Record<string, string> };

type Reply = { status: number; body: string } | "reject";

function install(reply: Reply, withSession = true): { calls: Call[] } {
  const store = new Map<string, string>();
  if (withSession) {
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
  const calls: Call[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string; headers: Record<string, string> }) => {
    calls.push({ url, body: init.body, headers: init.headers });
    if (reply === "reject") return Promise.reject(new Error("offline"));
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
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

const emma = { name: "Emma", countryCode: "DE" } as const;

describe("saveLearnerProfile", () => {
  test("PA-1. save_learner_profile에 이름과 나라 코드를 싣는다", async () => {
    const { calls } = install({ status: 204, body: "" });

    await expect(saveLearnerProfile(emma)).resolves.toBe(true);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://test.supabase.co/rest/v1/rpc/save_learner_profile");
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({
      p_name: "Emma",
      p_country_code: "DE",
    });
    expect(calls[0]?.headers["Authorization"]).toBe("Bearer access");
  });

  test.each([
    ["204 빈 본문", { status: 204, body: "" }, true],
    ["200", { status: 200, body: "" }, true],
    ["404 함수 없음", { status: 404, body: "{}" }, false],
    ["400", { status: 400, body: "{}" }, false],
    ["500", { status: 500, body: "" }, false],
    ["연결 실패", "reject", false],
    ["연결 실패 상태 0", { status: 0, body: "" }, false],
  ] as const)("PA-2. 저장 결과: %s", async (_label, reply, expected) => {
    install(reply);

    await expect(saveLearnerProfile(emma)).resolves.toBe(expected);
  });

  test("PA-2. 세션이 없으면 요청 없이 false다", async () => {
    const { calls } = install({ status: 204, body: "" }, false);

    await expect(saveLearnerProfile(emma)).resolves.toBe(false);
    expect(calls).toEqual([]);
  });
});

describe("loadLearnerProfile", () => {
  test("PA-1. load_learner_profile을 빈 본문으로 부른다", async () => {
    const { calls } = install({ status: 200, body: "null" });

    await loadLearnerProfile();

    expect(calls[0]?.url).toBe("https://test.supabase.co/rest/v1/rpc/load_learner_profile");
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({});
    expect(calls[0]?.headers["Authorization"]).toBe("Bearer access");
  });

  test("PA-3. 행이 없으면(200 null) 기록 없음으로 성공이다", async () => {
    install({ status: 200, body: "null" });

    await expect(loadLearnerProfile()).resolves.toEqual({ ok: true, record: null });
  });

  test("PA-3. 행이 있으면 기록이다", async () => {
    install({ status: 200, body: JSON.stringify({ name: "Emma", countryCode: "DE" }) });

    await expect(loadLearnerProfile()).resolves.toEqual({ ok: true, record: emma });
  });

  test.each([
    ["404", { status: 404, body: "{}" }],
    ["500", { status: 500, body: "" }],
    ["연결 실패", "reject"],
  ] as const)("PA-3. 요청 실패는 ok: false다: %s", async (_label, reply) => {
    install(reply);

    await expect(loadLearnerProfile()).resolves.toEqual({ ok: false });
  });

  test("PA-3. 세션이 없으면 ok: false다", async () => {
    install({ status: 200, body: "null" }, false);

    await expect(loadLearnerProfile()).resolves.toEqual({ ok: false });
  });

  test.each([
    ["깨진 JSON", "{"],
    ["배열", "[]"],
    ["문자열", '"Emma"'],
    ["나라 키 없음", JSON.stringify({ name: "Emma" })],
    ["이름만", JSON.stringify({ name: "Emma", countryCode: null })],
    ["나라만", JSON.stringify({ name: null, countryCode: "DE" })],
    ["둘 다 null", JSON.stringify({ name: null, countryCode: null })],
    ["이름 규칙 위반", JSON.stringify({ name: "{x}", countryCode: "DE" })],
    ["코드 형식 위반", JSON.stringify({ name: "Emma", countryCode: "de" })],
  ])("PA-4. 모양이 틀린 응답은 없음으로 읽지 않고 ok: false다: %s", async (_label, body) => {
    install({ status: 200, body });

    await expect(loadLearnerProfile()).resolves.toEqual({ ok: false });
  });

  test("PA-5. 어느 경우에도 던지지 않는다", async () => {
    install("reject");

    await expect(loadLearnerProfile()).resolves.toBeDefined();
    await expect(saveLearnerProfile(emma)).resolves.toBeDefined();
  });
});
