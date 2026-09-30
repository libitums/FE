import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "./auth-session";
import {
  appReviewRequestedStorageKey,
  loadEpisodeSurveyDone,
  markEpisodeSurveyDone,
  requestAppReviewOnce,
  submitFeedback,
} from "./feedback-api";

function install(extra: Record<string, unknown> = {}, status = 204) {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({
      accessToken: "access",
      refreshToken: "r",
      expiresAt: 4_102_444_800_000,
    }),
  );
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    ...extra,
  });
  const calls: { url: string; body: string }[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string }) => {
    calls.push({ url, body: init.body });
    return Promise.resolve({ status, text: async () => "" });
  });
  return { store, calls };
}

beforeEach(() => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("FB1 submitFeedback", () => {
  test("RPC 하나에 종류 · 별점 · 다듬은 글 · 맥락을 싣는다", async () => {
    const { calls } = install();
    await expect(
      submitFeedback({ kind: "general", rating: 5, message: "  great  ", context: {} }),
    ).resolves.toBe(true);
    expect(calls).toEqual([
      {
        url: "https://test.supabase.co/rest/v1/rpc/submit_feedback",
        body: JSON.stringify({ p_kind: "general", p_rating: 5, p_message: "great", p_context: {} }),
      },
    ]);
  });

  test("빈 글은 null로 보내고, 실패는 false", async () => {
    const { calls } = install({}, 400);
    await expect(
      submitFeedback({ kind: "episode", rating: 2, message: "   ", context: { episodeId: "e" } }),
    ).resolves.toBe(false);
    expect(JSON.parse(calls[0]!.body)).toMatchObject({
      p_message: null,
      p_context: { episodeId: "e" },
    });
  });
});

describe("FB2 에피소드 설문 기억", () => {
  test("한 번 적은 에피소드는 다시 적지 않고, 틀린 저장값은 빈 목록이다", () => {
    const { store } = install();
    expect(loadEpisodeSurveyDone()).toEqual([]);
    markEpisodeSurveyDone("a");
    markEpisodeSurveyDone("a");
    markEpisodeSurveyDone("b");
    expect(loadEpisodeSurveyDone()).toEqual(["a", "b"]);
    store.set("libitum.episode-survey.done", "not json");
    expect(loadEpisodeSurveyDone()).toEqual([]);
  });
});

describe("FB3 requestAppReviewOnce", () => {
  test("설치당 한 번만 요청하고, 모듈이 없으면 요청으로 치지 않는다", () => {
    const requestReview = vi.fn<() => void>();
    const { store } = install({ AppReviewModule: { requestReview } });
    expect(requestAppReviewOnce()).toBe(true);
    expect(requestAppReviewOnce()).toBe(false);
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(store.get(appReviewRequestedStorageKey)).toBe("1");

    vi.unstubAllGlobals();
    const bare = install();
    expect(requestAppReviewOnce()).toBe(false);
    expect(bare.store.has(appReviewRequestedStorageKey)).toBe(false);
  });
});
