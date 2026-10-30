// 스플래시 갱신 상태 — 받기 신호를 게이지 뷰와 측정 이벤트로 바꾸는 순수 리듀서입니다.
import type { EpisodeUpdateSplashClosedEvent } from "../lib/episode-update-event.contract";
import type { SplashUpdateView } from "../screens/splash/splash.contract";

export type SplashEpisodeProgress = {
  readonly id: string;
  readonly done: number;
  readonly total: number | null;
  readonly ready: "yes" | "no";
};
export type SplashUpdateCheck =
  // 매니페스트 응답 전
  | { readonly kind: "pending" }
  // 받기가 planned 없이 끝남(오프라인 · 404 · 손상)
  | { readonly kind: "unanswered" }
  // 받을 것 없음(또는 파일 모듈 없음)
  | { readonly kind: "nothing" }
  | { readonly kind: "updating"; readonly episodes: readonly SplashEpisodeProgress[] }
  | { readonly kind: "complete"; readonly episodes: readonly SplashEpisodeProgress[] }
  | { readonly kind: "failed"; readonly episodes: readonly SplashEpisodeProgress[] };
export type SplashUpdateState = {
  readonly window: "open" | "closed";
  /** 매니페스트 응답 전에도 기다리는가 — 받아 둘 수 있는 환경(파일 모듈 · 저장소)에서만 참입니다. */
  readonly waitsForCheck: boolean;
  readonly check: SplashUpdateCheck;
  readonly startedAt: number;
  readonly logoFinishedAt: number | null;
};
export type SplashUpdateSignal =
  | { readonly type: "planned"; readonly ids: readonly string[] }
  | {
      readonly type: "progressed";
      readonly id: string;
      readonly done: number;
      readonly total: number;
    }
  | { readonly type: "ready"; readonly id: string }
  | { readonly type: "finished" }
  | { readonly type: "logo-finished"; readonly at: number }
  | { readonly type: "closed" };

export function initialSplashUpdateState(
  startedAt: number,
  waitsForCheck: boolean = true,
): SplashUpdateState {
  return {
    window: "open",
    waitsForCheck,
    check: { kind: "pending" },
    startedAt,
    logoFinishedAt: null,
  };
}

function onProgress(episodes: readonly SplashEpisodeProgress[], signal: SplashUpdateSignal) {
  return episodes.map((episode): SplashEpisodeProgress => {
    if (signal.type === "progressed" && episode.id === signal.id) {
      const done = Math.max(episode.done, Math.min(signal.done, signal.total));
      return { ...episode, done, total: signal.total };
    }
    if (signal.type === "ready" && episode.id === signal.id) {
      return { ...episode, done: episode.total ?? 1, ready: "yes" };
    }
    return episode;
  });
}

function updated(state: SplashUpdateState, signal: SplashUpdateSignal): SplashUpdateState {
  const check = state.check;
  if (check.kind === "updating" && (signal.type === "progressed" || signal.type === "ready")) {
    if (!check.episodes.some((episode) => episode.id === signal.id)) return state;
    const episodes = onProgress(check.episodes, signal);
    const everyReady = episodes.every((episode) => episode.ready === "yes");
    return { ...state, check: { kind: everyReady ? "complete" : "updating", episodes } };
  }
  if (signal.type === "planned" && check.kind === "pending") {
    const episodes = signal.ids.map((id): SplashEpisodeProgress => ({
      id,
      done: 0,
      total: null,
      ready: "no",
    }));
    return {
      ...state,
      check: episodes.length === 0 ? { kind: "nothing" } : { kind: "updating", episodes },
    };
  }
  if (signal.type === "finished") {
    if (check.kind === "pending") return { ...state, check: { kind: "unanswered" } };
    if (check.kind === "updating") {
      return { ...state, check: { kind: "failed", episodes: check.episodes } };
    }
  }
  return state;
}

export function splashUpdateReducer(
  state: SplashUpdateState,
  signal: SplashUpdateSignal,
): SplashUpdateState {
  if (signal.type === "closed") return { ...state, window: "closed" };
  if (signal.type === "logo-finished") {
    return state.logoFinishedAt === null ? { ...state, logoFinishedAt: signal.at } : state;
  }
  return state.window === "closed" ? state : updated(state, signal);
}

/** 기다리는 에피소드 평균 진행률, [0, 1]. */
export function splashUpdateProgress(episodes: readonly SplashEpisodeProgress[]): number {
  if (episodes.length === 0) return 0;
  let sum = 0;
  for (const episode of episodes) {
    if (episode.ready === "yes") sum += 1;
    else if (episode.total !== null && episode.total > 0)
      sum += Math.min(1, episode.done / episode.total);
  }
  return sum / episodes.length;
}

const percentOf = (episodes: readonly SplashEpisodeProgress[]): number =>
  Math.floor(splashUpdateProgress(episodes) * 100 + 1e-9);

export function splashUpdateViewOf(state: SplashUpdateState): SplashUpdateView {
  const check = state.check;
  if (state.window === "closed") return { kind: "plain" };
  if (check.kind === "pending")
    return state.waitsForCheck ? { kind: "checking" } : { kind: "plain" };
  if (check.kind === "updating") {
    return { kind: "gauge", percent: Math.min(99, percentOf(check.episodes)), hold: "wait" };
  }
  if (check.kind === "complete") return { kind: "gauge", percent: 100, hold: "release" };
  if (check.kind === "failed") {
    return { kind: "gauge", percent: percentOf(check.episodes), hold: "release" };
  }
  return { kind: "plain" };
}

function outcomeOf(
  check: SplashUpdateCheck,
  replacedCount: number,
): EpisodeUpdateSplashClosedEvent["outcome"] | null {
  switch (check.kind) {
    case "pending":
    case "unanswered":
      return replacedCount > 0 ? "unchecked" : null;
    case "nothing":
      return "nothing";
    case "complete":
      return "complete";
    case "updating":
      return "timed-out";
    case "failed":
      return "failed";
  }
}

const elapsed = (from: number, to: number): string => String(Math.max(0, Math.round(to - from)));

export function splashClosedEventOf(
  state: SplashUpdateState,
  closedAt: number,
  replacedCount: number,
): EpisodeUpdateSplashClosedEvent | null {
  const outcome = outcomeOf(state.check, replacedCount);
  if (outcome === null) return null;
  const check = state.check;
  const waiting = check.kind === "updating" || check.kind === "complete" || check.kind === "failed";
  return {
    name: "episode_update_splash_closed",
    outcome,
    waitMs: state.logoFinishedAt === null ? "0" : elapsed(state.logoFinishedAt, closedAt),
    splashMs: elapsed(state.startedAt, closedAt),
    episodeCount: String(waiting ? check.episodes.length : 0),
    replacedCount: String(replacedCount),
  };
}
