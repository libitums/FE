import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";

// (2026-11-27 제보 — 정답 음성 중간에 다른 목소리) 맞힌 뒤의 소리 요청 순서를 App 한 트리에서 봅니다. 아래 대역 설명은 원래 흐름 테스트와 같고,
// 소리 호스트(`AudioPlaybackModule`)를 실제처럼 재생기 하나로 둡니다 — 끝나기 전에 새 `play`가 오면 겹침(끊김)으로 셉니다.
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
    legacyTutorial: legacyPassedRecord,
    catalogProgress,
  });

const env = {
  store: new Map<string, string>(),
  events: [] as EpisodeIntroEvent[],
  heard: [] as string[],
  /** 기기의 권한 · 인식기 상태입니다. 요청하면 `afterRequest`가 됩니다. */
  status: { microphone: "granted", speechRecognition: "granted", recognizerAvailable: true },
  afterRequest: { microphone: "granted", speechRecognition: "granted", recognizerAvailable: true },
  openedSettings: 0,
  saves: 0,
};

const granted = { microphone: "granted", speechRecognition: "granted", recognizerAvailable: true };

async function boot(
  catalogProgress: Record<string, readonly string[]>,
  status: typeof granted = granted,
  afterRequest: typeof granted = granted,
): Promise<void> {
  env.status = status;
  env.afterRequest = afterRequest;
  env.openedSettings = 0;
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
      getStatus: (callback: (payload: unknown) => void) => callback(env.status),
      requestPermissions: (callback: (payload: unknown) => void) => {
        env.status = env.afterRequest;
        callback(env.status);
      },
      openSettings: () => {
        env.openedSettings += 1;
      },
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

type Player = { calls: string[]; cutOff: string[]; finish: () => Promise<void> };

/** 부팅 뒤 소리 호스트를 붙입니다 — 저장소 · 인식 대역은 그대로 둡니다. */
function attachPlayer(): Player {
  const calls: string[] = [];
  const cutOff: string[] = [];
  let current: { source: string; done: (r: unknown) => void } | null = null;
  const modules = (globalThis as unknown as { NativeModules: Record<string, unknown> })
    .NativeModules;
  vi.stubGlobal("NativeModules", {
    ...modules,
    AudioPlaybackModule: {
      play: (source: string, done: (r: unknown) => void) => {
        calls.push(`play:${source.split("/").pop() ?? source}`);
        if (current !== null) cutOff.push(current.source);
        current = { source, done };
      },
      stop: () => {
        calls.push("stop");
        current = null;
      },
      pause: () => {},
      resume: () => {},
    },
  });
  return {
    calls,
    cutOff,
    finish: async () => {
      const playing = current;
      current = null;
      await act(async () => {
        playing?.done({});
      });
    },
  };
}

const progress = () => id("roleplay-talk-progress").getAttribute("accessibility-label");

test("[IRA1] 맞힌 뒤 내 문장 소리가 끝나기 전에는 상대의 다음 줄 소리가 나지 않는다 — 끊긴 소리 0, 끝나면 다음 턴", async () => {
  await boot({ "u01-water": u01Complete });
  const player = attachPlayer();
  fireEvent.tap(id("roleplay-list-item-story-u01-water"), {});
  tapButton("roleplay-preview-start");
  passCuts();
  const firstLine = player.calls.length;

  env.heard = ["아니요 괜찮아요"];
  fireEvent.tap(id("roleplay-mic-button"), {});
  const reply = player.calls[player.calls.length - 1] ?? "";
  expect(reply.startsWith("play:")).toBe(true);
  expect(player.calls.length).toBeGreaterThan(firstLine);

  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(progress()).toBe("Line 1 / 3");
  expect(player.calls[player.calls.length - 1]).toBe(reply);

  await player.finish();
  expect(progress()).toBe("Line 2 / 3");
  const next = player.calls[player.calls.length - 1] ?? "";
  expect(next.startsWith("play:")).toBe(true);
  expect(next).not.toBe(reply);
  expect(player.cutOff).toEqual([]);
});
