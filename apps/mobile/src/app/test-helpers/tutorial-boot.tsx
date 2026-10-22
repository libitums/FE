// 튜토리얼(u00) integration 테스트의 공용 부팅 · 조작 · 풀이 헬퍼입니다. 제품 코드가 import하지 않습니다.
// 이름에 `.test.`를 넣지 않습니다.
//
// 대역은 경계뿐입니다 — `NativeModules`(저장소 · 오디오 · 선택으로 파일 모듈 · 푸시 · Airbridge · 평점 창) ·
// `fetch`(Supabase 갱신 · 학습 RPC · 콘텐츠 버킷) · `vi.stubEnv`. 카탈로그 · 계획 · 화면 · 진행 모듈은 실물입니다.
// 쓰는 파일의 `afterEach`가 `resetApp`(episode-format-harness)을 부릅니다.

import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { vi } from "vitest";

import { App } from "../App";
import { catalogFinalPlanOf } from "../catalog-final-model";
import type { CatalogRoleplayTurn } from "../catalog-final-model";
import { authSessionStorageKey, serializeAuthSession } from "../../lib/auth-session";
import type { AnalyticsEvent, AnalyticsEventSinks } from "../../lib/analytics.contract";
import { productEventSinks } from "../../lib/airbridge-events-module";
import { entrySplashDurationMs } from "../../lib/entry-flow";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { isTypedAnswerCorrect } from "../../lib/hangul-keyboard";
import { learningItemGuideSeenStorageKey } from "../../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../../lib/learning-item-guide.test-support";
import { fillPlaceholders } from "../../lib/placeholder-fill";
import type { FillScript } from "../../lib/placeholder-fill";
import { EPISODE_BANNER_HOLD_MS } from "../../screens/catalog-cover/episode-banner";
import { contentNotFoundResponse, contentPathOf, isContentRequest } from "./content-requests";
import { tapButtonIn, tapId } from "./episode-format-harness";
import type { ProgressSeedShape } from "./progress-seed";

export const supabaseUrl = "https://test.supabase.co";
const userId = "u";

export type Rpc = { readonly name: string; readonly body: Record<string, unknown> };
export type TrackCall = readonly [string, Record<string, string>];

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: userId })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: userId },
});

/** 서버에 있는 진행(스냅숏)을 기기 캐시로도 두는 키입니다(`cached-learning-progress`). */
export const cachedProgressStorageKey = `libitum.progress.cached.${userId}`;

export type TutorialBootOptions = {
  /** 부팅 씨앗(`AppProgressSeed`)입니다. */
  readonly progressSeed?: ProgressSeedShape;
  /** `load_learning_progress`의 답입니다. 기본 `null`(서버에 진행 없음). */
  readonly load?: object | null;
  /** 서버가 내주는 콘텐츠입니다. 없으면 버킷 요청은 404입니다(`offline`이면 연결 실패). */
  readonly serve?: { readonly manifest: string; readonly episodes: Record<string, string> };
  /** 참이면 콘텐츠 버킷 요청이 모두 연결 실패(reject)입니다. */
  readonly offline?: boolean;
  /** 있으면 `NativeModules.ContentFileModule`로 세웁니다(받아 둔 파일 모듈 대역). */
  readonly contentFiles?: object;
  /** 부팅 전에 기기 저장소에 둘 값입니다. */
  readonly preStore?: Readonly<Record<string, string>>;
  /** 이전 실행의 저장소를 그대로 이어 쓸 때 넘깁니다(`preStore`보다 우선). */
  readonly store?: Map<string, string>;
  /** 부팅 때 호스트가 쥔 푸시 목적지입니다. 주면 푸시 모듈 대역을 세웁니다. */
  readonly pushOpened?: unknown;
};

export type TutorialBooted = {
  readonly rpcs: Rpc[];
  readonly urls: string[];
  readonly events: AnalyticsEvent[];
  readonly tracked: TrackCall[];
  readonly store: Map<string, string>;
  readonly requestReview: ReturnType<typeof vi.fn<() => void>>;
};

export async function flushAsync(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

type PushHost = { opened: unknown };

export async function bootTutorialApp(options: TutorialBootOptions = {}): Promise<TutorialBooted> {
  const store = options.store ?? new Map<string, string>(Object.entries(options.preStore ?? {}));
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  const tracked: TrackCall[] = [];
  const requestReview = vi.fn<() => void>();
  const pushHost: PushHost = { opened: options.pushOpened ?? null };
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    AudioPlaybackModule: {
      play: vi.fn<(source: string, done: (result: unknown) => void) => void>(),
      stop: vi.fn<() => void>(),
    },
    AirbridgeEventsModule: {
      trackEvent: (category: string, attributes: Record<string, string>) =>
        void tracked.push([category, attributes]),
    },
    AppReviewModule: { requestReview },
    ...(options.contentFiles === undefined ? {} : { ContentFileModule: options.contentFiles }),
    ...(options.pushOpened === undefined
      ? {}
      : {
          PushNotificationModule: {
            getStatus: (callback: (payload: unknown) => void) =>
              callback({ permission: "not-determined" }),
            register: vi.fn<() => void>(),
            takeOpened: (callback: (payload: unknown) => void) => {
              const target = pushHost.opened;
              pushHost.opened = null;
              callback({ target });
            },
            openSettings: vi.fn<() => void>(),
          },
        }),
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const rpcs: Rpc[] = [];
  const urls: string[] = [];
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    urls.push(url);
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    if (isContentRequest(url)) {
      if (options.offline === true) return Promise.reject(new Error("offline"));
      if (options.serve === undefined) return Promise.resolve(contentNotFoundResponse());
      if (contentPathOf(url) === "manifest.json") {
        return Promise.resolve({ status: 200, text: async () => options.serve?.manifest ?? "" });
      }
      const id = /^episodes\/([^/]+)\.json$/.exec(contentPathOf(url) ?? "")?.[1];
      const body = id === undefined ? undefined : options.serve.episodes[id];
      if (body === undefined) return Promise.resolve(contentNotFoundResponse());
      return Promise.resolve({ status: 200, text: async () => body });
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    rpcs.push({ name, body: JSON.parse(init?.body ?? "{}") as Record<string, unknown> });
    const reply =
      name === "load_learning_progress"
        ? { status: 200, body: JSON.stringify(options.load ?? null) }
        : name === "learning_streak" || name === "record_learning_days"
          ? { status: 200, body: "1" }
          : { status: 204, body: "" };
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
  });

  // 분석 sink 넷을 한 기록으로 모읍니다 — 진입점의 조립(`productEventSinks`)을 따라 Airbridge 전달도 겹칩니다.
  const events: AnalyticsEvent[] = [];
  const record = (event: AnalyticsEvent): void => void events.push(event);
  const sinks = productEventSinks({
    entryEventSink: record,
    notificationEventSink: record,
    settingsEventSink: record,
    episodeIntroEventSink: record,
  } as unknown as AnalyticsEventSinks);
  const sinkProps = sinks as unknown as object;
  const seedProps = (
    options.progressSeed === undefined ? {} : { progressSeed: options.progressSeed }
  ) as object;

  vi.useFakeTimers();
  render(<App {...sinkProps} {...seedProps} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flushAsync();
  return { rpcs, urls, events, tracked, store, requestReview };
}

// ---------------------------------------------------------------- 조작 · 관찰 헬퍼

export const tutorialCover = (episodeId = "u00-tutorial") =>
  screen.getByTestId(`ui-lynx-special-unit-catalog-cover-${episodeId}`);
export const tapCover = (episodeId = "u00-tutorial"): void =>
  void fireEvent.tap(tutorialCover(episodeId), {});
export const tapIntroNext = (): void => tapButtonIn("episode-intro-screen-next");
export const tapCutNext = (): void => tapButtonIn("catalog-cover-screen-next");

/** 컷을 끝까지 넘깁니다 — 대사를 쓰는 중이면 첫 탭은 완성이라 한 번 더 누릅니다. */
export function readAllCuts(count: number): void {
  for (let i = 0; i < count; i += 1) {
    const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
    if (dialog?.getAttribute("data-status") === "revealing") tapCutNext();
    tapCutNext();
  }
}

// 배너의 유지 시간만 가짜 시계로 밉니다 — 배너 앞에서 켜고 `passBanner`가 실제 시계로 되돌립니다.
export const useBannerClock = (): void => void vi.useFakeTimers();
export async function settleFake(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}
export function passBanner(): void {
  if (screen.queryByTestId("episode-banner-screen") !== null) {
    act(() => {
      vi.advanceTimersByTime(EPISODE_BANNER_HOLD_MS);
    });
  }
  vi.useRealTimers();
}

// ---------------------------------------------------------------- 최종 테스트(RP) 풀이

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill = (text: string, script: FillScript) => fillPlaceholders(text, {}, script);

/** 그 에피소드 최종 테스트의 계획(정답의 출처)입니다. */
export function finalPlanOf(episodeId: string, ordinal: number) {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  return catalogFinalPlanOf(entry, ordinal, fill, (path) => path);
}

function correctPlacement(turn: CatalogRoleplayTurn): number[] {
  const count = turn.tiles.length;
  const search = (placed: number[]): number[] | null => {
    if (placed.length === count) {
      const typed = placed.map((index) => turn.tiles[index]?.ko ?? "").join(" ");
      return turn.accepted.some((answer) => isTypedAnswerCorrect(typed, answer)) ? placed : null;
    }
    for (let index = 0; index < count; index += 1) {
      if (placed.includes(index)) continue;
      const found = search([...placed, index]);
      if (found !== null) return found;
    }
    return null;
  };
  const found = search([]);
  if (found === null) throw new Error(`no placement: ${turn.id}`);
  return found;
}

/** 최종 테스트의 턴을 모두 타일로 맞힙니다. */
export function solveFinalTurns(turns: readonly CatalogRoleplayTurn[]): void {
  for (const turn of turns) {
    for (const tile of correctPlacement(turn)) tapId(`sentence-order-chip-${tile}`);
    tapButtonIn("catalog-final-screen-action");
    tapButtonIn("catalog-final-screen-action");
  }
}
