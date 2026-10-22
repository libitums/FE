// 문항 음성 integration 테스트의 부팅 · 계획 헬퍼입니다. 제품 코드가 import하지 않습니다.
// 이름에 `.test.`를 넣지 않습니다.
//
// 대역은 경계뿐입니다 - `NativeModules`(저장소 · 재생 · 말하기) · `fetch` · `vi.stubEnv`. 카탈로그 · 계획 · 화면은
// 실물입니다. 이 헬퍼를 쓰는 파일은 `../lib/episode-bundled`를 `withItemAudioIds`로 갈아 끼웁니다.

import { vi } from "vitest";
import { render } from "@lynx-js/react/testing-library";

import { App } from "../App";
import { catalogLessonPlanOf } from "../catalog-lesson-plan";
import type { CatalogLessonPlan } from "../catalog-lesson-plan";
import { contentNotFoundResponse, isContentRequest } from "./content-requests";
import { flush } from "./episode-format-harness";
import { passSplash } from "./pass-splash";
import { legacyPassedRecord, legacyPassedSeed, tutorialDoneProgress } from "./progress-seed";
import { itemAudioId } from "./item-audio-content";
import { authSessionStorageKey, serializeAuthSession } from "../../lib/auth-session";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { learningItemGuideSeenStorageKey } from "../../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../../lib/placeholder-fill";
import type { FillScript } from "../../lib/placeholder-fill";
import type { EpisodeIntroEvent } from "../../screens/episode-intro/episode-intro.contract";

const supabaseUrl = "https://test.supabase.co";
const contentBase = `${supabaseUrl}/storage/v1/object/public/content/`;

/** 호스트가 받아 둔 음성 파일의 주소입니다 — 학습 문항 음성은 받은 파일만 소리가 됩니다. */
const fileUrlOf = (path: string): string => `file:///c/${path}`;

/** 내장 사본의 문항 음성이 앱에서 풀리는 재생 주소(받아 둔 파일)입니다. */
export const itemAudioUrl = (episodeId: string, itemId: string): string =>
  fileUrlOf(`audio/${itemAudioId(episodeId, itemId)}.m4a`);

export type Done = (result: unknown) => void;
export type HostSpies = {
  readonly play: ReturnType<typeof vi.fn<(source: string, done: Done) => void>>;
  readonly playAtRate: ReturnType<typeof vi.fn<(source: string, rate: number, done: Done) => void>>;
  readonly stop: ReturnType<typeof vi.fn<() => void>>;
  readonly pause: ReturnType<typeof vi.fn<() => void>>;
  readonly resume: ReturnType<typeof vi.fn<() => void>>;
  readonly speechStart: ReturnType<typeof vi.fn<() => void>>;
};

/** `modern` = 속도 재생이 있는 호스트, `legacy` = `playAtRate`가 없는 옛 호스트, `none` = 재생 모듈 없음. */
export type AudioHostKind = "modern" | "legacy" | "none";

export type ItemAudioBooted = {
  readonly events: EpisodeIntroEvent[];
  readonly host: HostSpies;
};

export type ItemAudioBootOptions = {
  readonly progress: Record<string, string[]>;
  readonly host?: AudioHostKind;
  /** `all`(기본) = 음성을 모두 받아 둔 기기, `none` = 받아 둔 파일이 없는 첫 설치. */
  readonly files?: "all" | "none";
  /** 주면 말하기 모듈 대역을 세웁니다 — `heard(n)`이 n번째 시도의 인식 글자입니다. */
  readonly heard?: (attempt: number) => string | null;
  /** 받아 둔 그림 파일의 버킷 상대 경로입니다(예: 상대 아바타). 없으면 그림 파일은 하나도 없습니다. */
  readonly imageFiles?: readonly string[];
};

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

const tutorialDoneSnapshot = {
  version: 1,
  completedStepCount: legacyPassedRecord.completedStepCount,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  visualNovel: { status: "completed", beatIndex: 2 },
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

export async function bootItemAudioApp(options: ItemAudioBootOptions): Promise<ItemAudioBooted> {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  const host: HostSpies = {
    play: vi.fn<(source: string, done: Done) => void>(),
    playAtRate: vi.fn<(source: string, rate: number, done: Done) => void>(),
    stop: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
    resume: vi.fn<() => void>(),
    speechStart: vi.fn<() => void>(),
  };
  const kind = options.host ?? "modern";
  const audioModule =
    kind === "none"
      ? {}
      : {
          AudioPlaybackModule: {
            play: host.play,
            ...(kind === "modern" ? { playAtRate: host.playAtRate } : {}),
            stop: host.stop,
            pause: host.pause,
            resume: host.resume,
          },
        };
  const fileModule = {
    ContentFileModule: {
      download: vi.fn<() => void>(),
      remove: vi.fn<() => void>(),
      fileUrl: (path: string) =>
        (options.files !== "none" && path.startsWith("audio/")) ||
        (options.imageFiles ?? []).includes(path)
          ? fileUrlOf(path)
          : null,
    },
  };
  const heard = options.heard;
  let attempts = 0;
  const speechModule =
    heard === undefined
      ? {}
      : {
          SpeechRecognitionModule: {
            getStatus: () => {},
            requestPermissions: (callback: (payload: unknown) => void) =>
              callback({
                microphone: "granted",
                speechRecognition: "granted",
                recognizerAvailable: true,
              }),
            start: (_args: unknown, callback: (payload: unknown) => void) => {
              host.speechStart();
              const text = heard(attempts);
              attempts += 1;
              callback(
                text === null
                  ? { status: "recognition-failed", text: "", isFinal: true }
                  : { status: "recognized", text, isFinal: true },
              );
            },
            stop: () => {},
          },
        };
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    ...audioModule,
    ...fileModule,
    ...speechModule,
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const snapshot = {
    ...tutorialDoneSnapshot,
    catalogProgress: { ...tutorialDoneProgress(), ...options.progress },
  };
  vi.stubGlobal("fetch", (url: string) => {
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(url)) return Promise.resolve(contentNotFoundResponse());
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
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
    <App progressSeed={legacyPassedSeed} episodeIntroEventSink={(event) => events.push(event)} />,
  );
  await passSplash();
  vi.useRealTimers();
  await flush();
  return { events, host };
}

// ---------------------------------------------------------------- 계획 (정답의 출처)

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill = (text: string, script: FillScript) => fillPlaceholders(text, {}, script);
const urlOf = (path: string): string => `${contentBase}${path}`;
const audioFileUrlOf = (path: string): string => fileUrlOf(path);

/** 문항 음성이 풀리는 레슨 계획입니다(`withSound` 거짓이면 소리 없는 계획). */
export function lessonPlanWith(
  episodeId: string,
  key: string,
  withSound = true,
): CatalogLessonPlan {
  const entry = catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  const plan = withSound
    ? catalogLessonPlanOf(entry, key, fill, urlOf, audioFileUrlOf)
    : catalogLessonPlanOf(entry, key, fill, urlOf);
  if (plan === null) throw new Error(`no unit: ${key}`);
  return plan;
}

/** 문항 값에서 아직 타입에 없는 `audio.source`를 읽습니다. */
export function audioSourceOf(question: object): string | null {
  const audio = (question as { audio?: { source?: string } | null }).audio;
  return audio?.source ?? null;
}
