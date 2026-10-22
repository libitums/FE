// 스플래시 갱신 컨트롤러 — 순수 상태에 시각 · 교체 · 다시 읽기 · 이벤트 전송을 주입해 묶습니다.
import type { RefreshObserver } from "../lib/episode-refresh";
import type { EpisodeUpdateSplashClosedEvent } from "../lib/episode-update-event.contract";
import type { SplashUpdateView } from "../screens/splash/splash.contract";
import {
  initialSplashUpdateState,
  splashClosedEventOf,
  splashUpdateReducer,
  splashUpdateViewOf,
} from "./splash-update-state";
import type { SplashUpdateSignal } from "./splash-update-state";

export type SplashUpdateControllerDeps = {
  readonly now: () => number;
  /** 앱 시작 교체에서 올린 수. */
  readonly startPromoted: number;
  /** 자리표시 포트의 close가 effect 전에 불렸는가. "yes"면 창을 닫힌 채 시작합니다(교체 · 이벤트 없음). */
  readonly closedBeforeStart: "yes" | "no";
  /** 뷰가 바뀔 때만 부릅니다(같은 값이면 부르지 않음). */
  readonly onView: (view: SplashUpdateView) => void;
  /** 준비된 스테이징을 교체하고 올린 id를 냅니다. */
  readonly promote: () => readonly string[];
  /** 병합 없이 카탈로그를 다시 읽습니다. */
  readonly reload: () => void;
  readonly send: (event: EpisodeUpdateSplashClosedEvent) => void;
};
export type SplashUpdateController = {
  /** 첫 받기 차례에 넘길 관찰자. 창이 닫힌 뒤의 신호는 무시됩니다. */
  readonly observer: RefreshObserver;
  /** 첫 받기 차례가 끝났을 때(결과와 무관) 한 번. */
  readonly finished: () => void;
  readonly logoFinished: () => void;
  /** 한 번만: 창을 닫고 준비된 교체를 올리고 이벤트를 냅니다. */
  readonly close: () => void;
};

export function createSplashUpdateController(
  deps: SplashUpdateControllerDeps,
): SplashUpdateController {
  let state = initialSplashUpdateState(deps.now());
  if (deps.closedBeforeStart === "yes") {
    state = splashUpdateReducer(state, { type: "closed" });
  }
  let shown = splashUpdateViewOf(state);

  const sameView = (a: SplashUpdateView, b: SplashUpdateView): boolean =>
    a.kind === "plain" || b.kind === "plain"
      ? a.kind === b.kind
      : a.percent === b.percent && a.hold === b.hold;

  const apply = (signal: SplashUpdateSignal): void => {
    state = splashUpdateReducer(state, signal);
    const view = splashUpdateViewOf(state);
    if (sameView(shown, view)) return;
    shown = view;
    deps.onView(view);
  };

  return {
    observer: {
      planned: (ids) => apply({ type: "planned", ids }),
      progressed: (id, done, total) => apply({ type: "progressed", id, done, total }),
      ready: (id) => apply({ type: "ready", id }),
    },
    finished: () => apply({ type: "finished" }),
    logoFinished: () => apply({ type: "logo-finished", at: deps.now() }),
    close: () => {
      if (state.window === "closed") return;
      const before = state;
      const promoted = deps.promote();
      if (promoted.length > 0) deps.reload();
      const event = splashClosedEventOf(before, deps.now(), deps.startPromoted + promoted.length);
      if (event !== null) deps.send(event);
      apply({ type: "closed" });
    },
  };
}
