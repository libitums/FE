import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import type { SettingsEvent } from "../screens/settings/settings.contract";

// 「설정 피드백 → 서버」와 「에피소드를 끝냄 → 연속 모달 → 설문 → 서버 · 평점 창」을 한 트리에서 봅니다(IF1 · IF2,
// ADR-0036). 대역은 경계뿐입니다 — `StorageModule` · `AppReviewModule` · `fetch`(Supabase 갱신 · RPC).

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };

const accessToken = `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`;
const refreshedBody = JSON.stringify({
  access_token: accessToken,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

async function boot(ui: Parameters<typeof render>[0]) {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken, refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  const requestReview = vi.fn<() => void>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    AppReviewModule: { requestReview },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const rpcs: Rpc[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string }) => {
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    rpcs.push({ name, body: JSON.parse(init.body) as Record<string, unknown> });
    const body = name === "record_learning_days" ? "1" : name === "learning_streak" ? "0" : "null";
    return Promise.resolve({ status: 200, text: async () => body });
  });

  vi.useFakeTimers();
  render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  return { rpcs, store, requestReview };
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const tapButtonIn = (testId: string) =>
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("[IF1] 설정 → Send feedback → 별점 · 보내기 → 서버에 한 건 · 이벤트 한 번 · 감사 문구", async () => {
  const events: SettingsEvent[] = [];
  const { rpcs } = await boot(<App settingsEventSink={(e) => events.push(e)} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-feedback")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  expect(screen.getByTestId("feedback-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-5"), {});
  tapButtonIn("feedback-screen-send");
  await flush();

  const submitted = rpcs.filter((rpc) => rpc.name === "submit_feedback");
  expect(submitted).toEqual([
    {
      name: "submit_feedback",
      body: { p_kind: "general", p_rating: 5, p_message: null, p_context: {} },
    },
  ]);
  expect(events).toContainEqual({ name: "feedback_opened" });
  expect(events).toContainEqual({ name: "feedback_submitted", rating: "5", hasMessage: false });
  expect(screen.getByTestId("feedback-screen-sent")).toBeInTheDocument();
});
