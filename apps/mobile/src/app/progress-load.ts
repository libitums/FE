import type { ProgressLoadEvent } from "../lib/progress-load-event.contract";
import { knownProgressLoad } from "../screens/journey-map/journey-map-load";
import type { JourneyMapProgressLoad } from "../screens/journey-map/journey-map-load.contract";
import { mergeJourneyProgress } from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";
import type { ProgressLoadAction, ProgressLoadPhase } from "./progress-load.contract";

export const PROGRESS_LOAD_ROW_DELAY_MS = 1_000;
export const initialProgressLoadPhase: ProgressLoadPhase = "idle";

const loadedFrom: Readonly<Record<ProgressLoadPhase, boolean>> = {
  idle: false,
  hydrated: true,
  checking: true,
  loading: true,
  failed: true,
  retrying: true,
  loaded: false,
};
const failedFrom: Readonly<Record<ProgressLoadPhase, boolean>> = {
  idle: false,
  hydrated: false,
  checking: true,
  loading: true,
  failed: false,
  retrying: true,
  loaded: false,
};

/** 전이표는 docs/adr/0062-progress-cache-first.md. 표에 없는 칸은 같은 값입니다. */
export function progressLoadReducer(
  phase: ProgressLoadPhase,
  action: ProgressLoadAction,
): ProgressLoadPhase {
  switch (action.type) {
    case "started":
      return action.local === "restored" ? "hydrated" : "checking";
    case "delayElapsed":
      return phase === "checking" ? "loading" : phase;
    case "settled":
      if (action.outcome === "loaded") return loadedFrom[phase] ? "loaded" : phase;
      return failedFrom[phase] ? "failed" : phase;
    case "retryRequested":
      return phase === "failed" ? "retrying" : phase;
  }
}

export function localProgressFrom(
  cached: JourneyProgressState | null,
  pending: JourneyProgressState | null,
): JourneyProgressState | null {
  if (cached === null) return pending;
  if (pending === null) return cached;
  return mergeJourneyProgress(cached, pending);
}

export function journeyMapProgressLoadOf(
  phase: ProgressLoadPhase,
  onRetry: () => void,
): JourneyMapProgressLoad {
  switch (phase) {
    case "checking":
      return { status: "checking" };
    case "loading":
      return { status: "loading" };
    case "retrying":
      return { status: "retrying" };
    case "failed":
      return { status: "failed", onRetry };
    case "idle":
    case "hydrated":
    case "loaded":
      return knownProgressLoad;
  }
}

const delayedEvent: ProgressLoadEvent = { name: "progress_load_delayed" };

export function progressLoadEventFor(
  previous: ProgressLoadPhase,
  next: ProgressLoadPhase,
): ProgressLoadEvent | null {
  if (next === "loading") return previous === "checking" ? delayedEvent : null;
  if (next === "failed") {
    if (previous === "checking" || previous === "loading") {
      return { name: "progress_load_failed", attempt: "first" };
    }
    return previous === "retrying" ? { name: "progress_load_failed", attempt: "retry" } : null;
  }
  if (next === "loaded") {
    if (previous === "failed") return { name: "progress_load_recovered", trigger: "auto" };
    return previous === "retrying" ? { name: "progress_load_recovered", trigger: "manual" } : null;
  }
  return null;
}
