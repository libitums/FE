import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { productJourneySeed } from "./journey-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";

// 에피소드 롤플레이를 App 한 트리에서 봅니다 — 롤플레이 탭의 본편 구획(잠김 · 열림) · 미리보기 → 표지 컷 →
// 말하기 대화 → 결과 · 목록으로. 대역은 경계뿐입니다 — `StorageModule` · 인식 모듈 · `fetch` · 이벤트 sink.

const user = "u";
const u01Complete = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const accessToken = `${base64Url({ alg: "none" })}.${base64Url({
  sub: user,
  app_metadata: { provider: "google", providers: ["google"] },
})}.sig`;

const progressOf = (catalogProgress: Record<string, readonly string[]>) =>
  learningProgressSnapshotFrom({
    ...productJourneySeed,
    completedStepCount: 8,
    completedEpisodeIntroIds: ["tutorial-intro"],
    completedEpisodeFinalIds: ["tutorial-final-test"],
    catalogProgress,
  });

const env = {
  store: new Map<string, string>(),
  events: [] as EpisodeIntroEvent[],
  heard: [] as string[],
  saves: 0,
};

async function boot(catalogProgress: Record<string, readonly string[]>): Promise<void> {
  env.store = new Map();
  env.store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  env.store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  env.events = [];
  env.saves = 0;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => env.store.get(key) ?? null,
      set: (key: string, value: string) => void env.store.set(key, value),
      remove: (key: string) => void env.store.delete(key),
    },
    SpeechRecognitionModule: {
      getStatus: () => {},
      requestPermissions: (callback: (payload: unknown) => void) =>
        callback({
          microphone: "granted",
          speechRecognition: "granted",
          recognizerAvailable: true,
        }),
      start: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "recognized", text: env.heard.shift() ?? "", isFinal: true }),
      stop: () => {},
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const body = JSON.stringify(progressOf(catalogProgress));
  vi.stubGlobal("fetch", async (url: string) => {
    if (isContentRequest(url)) return contentNotFoundResponse();
    if (url.includes("grant_type=refresh_token")) {
      return {
        status: 200,
        text: async () =>
          JSON.stringify({
            access_token: accessToken,
            refresh_token: "refreshed",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: user },
          }),
      };
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    if (name === "save_learning_progress") env.saves += 1;
    if (name === "load_learning_progress") return { status: 200, text: async () => body };
    if (name === "learning_streak" || name === "record_learning_days") {
      return { status: 200, text: async () => "0" };
    }
    return { status: 204, text: async () => "" };
  });
  vi.useFakeTimers();
  render(<App episodeIntroEventSink={(event) => env.events.push(event)} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tapButton = (testId: string) =>
  fireEvent.tap(within(id(testId)).getByTestId("ui-lynx-button"), {});

/** 표지 컷을 끝까지 넘깁니다 — 컷마다 한 번은 타자기를 마치고 한 번은 넘깁니다. */
function passCuts(): void {
  for (let i = 0; i < 30 && maybe("roleplay-talk-screen") === null; i += 1) {
    fireEvent.tap(id("catalog-cover-screen-next"), {});
  }
}

test("[IR1] 본편 에피소드마다 롤플레이 구획이 서고, 끝낸 에피소드만 열린다", async () => {
  await boot({ "u01-water": u01Complete });
  expect(id("roleplay-list-section-u01-water")).toHaveAttribute("data-unlocked", "true");
  expect(id("roleplay-list-section-u02-checkin")).toHaveAttribute("data-unlocked", "false");
  expect(id("roleplay-list-section-u03-mina")).toHaveAttribute("data-unlocked", "false");
  expect(id("roleplay-list-item-title-story-u01-water")).toHaveTextContent("Buying Water");
  expect(id("roleplay-list-item-form-story-u01-water")).toHaveTextContent("Roleplay · 3 lines");
  expect(id("roleplay-list-item-lock-story-u02-checkin")).toBeInTheDocument();
});

test("[IR2] 미리보기 → 표지 컷 → 세 턴을 말하고 결과 → Back to list, 열림 · 끝 이벤트 한 번씩", async () => {
  await boot({ "u01-water": u01Complete });
  fireEvent.tap(id("roleplay-list-item-story-u01-water"), {});
  expect(env.events).toContainEqual({ name: "roleplay_story_opened", episodeId: "u01-water" });
  expect(id("roleplay-preview-title")).toHaveTextContent("Episode 1.");
  tapButton("roleplay-preview-start");
  expect(id("catalog-cover-screen")).toBeInTheDocument();
  passCuts();
  expect(id("roleplay-talk-line")).toHaveTextContent("봉투 드릴까요?");

  env.heard = ["아니요 괜찮아요", "현금으로 할게요", "아니요 영수증은 괜찮아요"];
  for (let turn = 0; turn < 3; turn += 1) {
    fireEvent.tap(id("roleplay-talk-mic"), {});
    tapButton("roleplay-talk-next");
  }
  expect(id("lesson-complete-screen")).toBeInTheDocument();
  expect(env.events).toContainEqual({
    name: "roleplay_story_completed",
    episodeId: "u01-water",
    correctCount: "2",
    judgedCount: "3",
    skippedCount: "0",
  });
  expect(maybe("lesson-complete-tickets")).not.toBeInTheDocument();
  tapButton("lesson-complete-screen-exit");
  expect(id("roleplay-list-section-u01-water")).toBeInTheDocument();
});

test("[IR3] 롤플레이는 진행을 바꾸지 않는다 — 마쳐도 서버 저장이 없다", async () => {
  await boot({ "u01-water": u01Complete });
  const before = env.saves;
  fireEvent.tap(id("roleplay-list-item-story-u01-water"), {});
  tapButton("roleplay-preview-start");
  passCuts();
  env.heard = ["아니요 괜찮아요", "카드로 할게요", "아니요 영수증은 괜찮아요"];
  for (let turn = 0; turn < 3; turn += 1) {
    fireEvent.tap(id("roleplay-talk-mic"), {});
    tapButton("roleplay-talk-next");
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(id("lesson-complete-screen")).toBeInTheDocument();
  expect(env.saves).toBe(before);
});

test("[IR4] 잠긴 카드는 눌러도 열리지 않는다", async () => {
  await boot({});
  fireEvent.tap(id("roleplay-list-item-story-u01-water"), {});
  expect(maybe("roleplay-preview-screen")).not.toBeInTheDocument();
  expect(env.events.filter((event) => event.name === "roleplay_story_opened")).toHaveLength(0);
});
