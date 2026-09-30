import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import type { AppJourneySeed } from "./journey-progress";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import type { SettingsEvent } from "../screens/settings/settings.contract";

// 「설정 피드백 → 서버」와 「에피소드를 끝냄 → 연속 모달 → 설문 → 서버 · 평점 창」을 한 트리에서 봅니다(IF1 · IF2,
// ADR-0036). 대역은 경계뿐입니다 — `StorageModule` · `AppReviewModule` · `fetch`(Supabase 갱신 · RPC).

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };

const refreshedBody = JSON.stringify({
  access_token: "refreshed-access",
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

async function boot(ui: Parameters<typeof render>[0]) {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
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
    const body = name === "record_learning_day" ? "1" : name === "learning_streak" ? "0" : "null";
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
  const { rpcs } = await boot(
    <App completedEpisodeIntroIds={["tutorial-intro"]} settingsEventSink={(e) => events.push(e)} />,
  );
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

// 표지만 남긴 진행입니다 — 표지를 끝내면 에피소드의 모든 항목이 끝납니다.
const allButIntro: AppJourneySeed = {
  completedStepCount: 1000,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

test("[IF2] 에피소드를 끝내면 연속 모달 뒤 설문이 뜨고, 4점 이상이면 서버에 남기고 평점 창을 한 번 청한다", async () => {
  const events: EpisodeIntroEvent[] = [];
  const { rpcs, store, requestReview } = await boot(
    <App
      journeySeed={allButIntro}
      completedEpisodeIntroIds={[]}
      episodeIntroEventSink={(e) => events.push(e)}
    />,
  );

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-tutorial-intro"), {});
  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-skip");
  tapButtonIn("lesson-complete-screen-exit");
  await flush();

  // 연속이 늘어 모달이 먼저 섭니다 — 닫으면 설문입니다.
  const back = screen.getByTestId("journey-stat-modal-back");
  fireEvent.tap(back.querySelector('[data-testid="ui-lynx-round-button"]')!, {});
  expect(screen.getByTestId("episode-survey-options")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-5"), {});
  await flush();

  expect(screen.queryByTestId("episode-survey-options")).toBeNull();
  const submitted = rpcs.filter((rpc) => rpc.name === "submit_feedback");
  expect(submitted).toHaveLength(1);
  expect(submitted[0]!.body).toMatchObject({ p_kind: "episode", p_rating: 5 });
  const episodeId = (submitted[0]!.body["p_context"] as Record<string, string>)["episodeId"];
  expect(events).toContainEqual({ name: "episode_survey_answered", episodeId, rating: "5" });
  expect(requestReview).toHaveBeenCalledTimes(1);
  expect(store.get("libitum.episode-survey.done")).toBe(JSON.stringify([episodeId]));
});
