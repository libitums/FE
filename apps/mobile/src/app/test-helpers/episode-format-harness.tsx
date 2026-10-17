// 새 형식 내장본 integration 테스트의 공용 부팅 · 조작 · 풀이 헬퍼입니다.
// 제품 코드가 import하지 않습니다. 이름에 `.test.`를 넣지 않습니다.
//
// 대역은 경계뿐입니다 - `NativeModules`(저장소 · 오디오) · `fetch`(Supabase 갱신 · 학습 RPC · 콘텐츠 버킷) ·
// `vi.stubEnv`. 카탈로그 · 계획 · 화면은 실물입니다. 쓰는 파일의 `afterEach`가 `resetApp`을 부릅니다.

import { vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "../App";
import type { AppJourneySeed } from "../journey-progress";
import { catalogLessonPlanOf } from "../catalog-lesson-plan";
import type { CatalogActivity, CatalogLessonPlan } from "../catalog-lesson-plan";
import { resetPushWiringForTests } from "../push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./content-requests";
import { authSessionStorageKey, serializeAuthSession } from "../../lib/auth-session";
import { entrySplashDurationMs } from "../../lib/entry-flow";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { learningItemGuideSeenStorageKey } from "../../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../../lib/placeholder-fill";
import type { FillScript } from "../../lib/placeholder-fill";
import type { EpisodeIntroEvent } from "../../screens/episode-intro/episode-intro.contract";
import { journeySteps } from "../../screens/journey-map/journey-map";
import { catalogNodeTestId } from "./map-unit-testid";

const supabaseUrl = "https://test.supabase.co";

export type Rpc = { readonly name: string; readonly body: Record<string, unknown> };

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

const tutorialDoneSeed: AppJourneySeed = {
  completedStepCount: journeySteps.length,
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovelProgress: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

const tutorialDoneSnapshot = {
  version: 1,
  completedStepCount: journeySteps.length,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovel: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

export const u01 = "u01-water";
export const u02 = "u02-checkin";
export const u03 = "u03-mina";
export const throughS8 = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

// ---------------------------------------------------------------- 계획 (정답의 출처)

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill = (text: string, script: FillScript) => fillPlaceholders(text, {}, script);
const imageUrlOf = (path: string): string => `https://cdn/${path}`;

export function lessonPlan(episodeId: string, key: string): CatalogLessonPlan {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  const plan = catalogLessonPlanOf(entry, key, fill, imageUrlOf);
  if (plan === null) throw new Error(`no unit: ${key}`);
  return plan;
}

// ---------------------------------------------------------------- 부팅

export type Booted = { readonly rpcs: Rpc[]; readonly events: EpisodeIntroEvent[] };

export async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 음성 인식 대역입니다. `heard(n)`은 n번째 `start`의 인식 글자이고 `null`이면 인식 실패입니다. */
export type SpeechOption = {
  readonly granted: boolean;
  readonly heard: (attempt: number) => string | null;
};
export type BootOptions = { readonly speech?: SpeechOption };

function speechModuleOf(speech: SpeechOption) {
  let attempts = 0;
  const status = speech.granted ? "granted" : "denied";
  return {
    getStatus: () => {},
    requestPermissions: (callback: (payload: unknown) => void) =>
      callback({ microphone: status, speechRecognition: status, recognizerAvailable: true }),
    start: (_args: unknown, callback: (payload: unknown) => void) => {
      const text = speech.heard(attempts);
      attempts += 1;
      callback(
        text === null
          ? { status: "recognition-failed", text: "", isFinal: true }
          : { status: "recognized", text, isFinal: true },
      );
    },
    stop: () => {},
  };
}

export async function boot(
  progress: Record<string, string[]>,
  options: BootOptions = {},
): Promise<Booted> {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  vi.stubGlobal("NativeModules", {
    ...(options.speech === undefined
      ? {}
      : { SpeechRecognitionModule: speechModuleOf(options.speech) }),
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    AudioPlaybackModule: {
      play: vi.fn<(source: string, done: (result: unknown) => void) => void>(),
      stop: vi.fn<() => void>(),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const rpcs: Rpc[] = [];
  const snapshot = { ...tutorialDoneSnapshot, catalogProgress: progress };
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(url)) return Promise.resolve(contentNotFoundResponse());
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    rpcs.push({ name, body: JSON.parse(init?.body ?? "{}") as Record<string, unknown> });
    const reply =
      name === "load_learning_progress"
        ? { status: 200, body: JSON.stringify(snapshot) }
        : name === "learning_streak" || name === "record_learning_days"
          ? { status: 200, body: "1" }
          : { status: 204, body: "" };
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
  });

  const events: EpisodeIntroEvent[] = [];
  vi.useFakeTimers();
  render(
    <App
      journeySeed={tutorialDoneSeed}
      completedEpisodeIntroIds={["tutorial-intro"]}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  return { rpcs, events };
}

export function resetApp(): void {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}

// ---------------------------------------------------------------- 조작 · 관찰 헬퍼

export const tapId = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
export const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
export const node = (episodeId: string, key: string) =>
  screen.getByTestId(catalogNodeTestId(episodeId, key));
// 열린 노드를 누르면 말풍선이 서고 `Start`가 유닛을 엽니다. 잠긴 노드는 말풍선이 없어 누름으로 끝납니다.
export const tapNode = (episodeId: string, key: string): void => {
  fireEvent.tap(node(episodeId, key), {});
  const start = screen.queryByTestId("step-sheet-start");
  if (start !== null) fireEvent.tap(start, {});
};
export const status = (episodeId: string, key: string) =>
  node(episodeId, key).getAttribute("data-status");
export const cover = (episodeId: string) =>
  screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${episodeId}`);
export const exitResult = () => tapButtonIn("lesson-complete-screen-exit");
export const title = () => screen.getByTestId("lesson-complete-screen-title");
// 칩의 이름(`2 trophies`)에서 읽습니다 — 오름 재생(ADR-0064) 동안 칩은 옛 값과 새 값을 함께 보이지만 이름은 처음부터 새 값입니다.
export const trophyCount = (): number =>
  Number(
    /\d+/.exec(screen.getByTestId("top-bar-trophy").getAttribute("accessibility-label") ?? "")?.[0],
  );

export const savedProgress = (rpcs: readonly Rpc[]): Record<string, unknown>[] =>
  rpcs
    .filter((rpc) => rpc.name === "save_learning_progress")
    .map((rpc) => rpc.body["p_progress"] as Record<string, unknown>);
export const savedUnits = (rpcs: readonly Rpc[], episodeId: string): string[] =>
  (savedProgress(rpcs).at(-1)?.["catalogProgress"] as Record<string, string[]> | undefined)?.[
    episodeId
  ] ?? [];

export const learningEvents = (events: readonly EpisodeIntroEvent[]) =>
  events.filter((event) => event.name.startsWith("episode_lesson_"));

export const contentIdOf: Record<CatalogActivity["form"], string> = {
  "word-choice": "word-choice-screen-content",
  listening: "listening-screen-content",
  "sentence-order": "sentence-order-screen-content",
  typing: "typing-activity-content",
  "vocab-card": "vocab-card-content",
  "pair-match": "pair-match-content",
  "culture-card": "culture-card-content",
  "syllable-build": "syllable-build-content",
  "read-aloud": "read-aloud-content",
  "speak-word": "speak-word-content",
};
export const activityScreenIds = Object.values(contentIdOf);
