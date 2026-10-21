import { describe, expect, test, vi } from "vitest";

import type { EpisodeUpdateSplashClosedEvent } from "../lib/episode-update-event.contract";
import type { SplashUpdateView } from "../screens/splash/splash.contract";
import {
  createSplashUpdateController,
  type SplashUpdateControllerDeps,
} from "./splash-update-controller";

// `unit` 계층: 컨트롤러가 순수 상태에 시각 · 교체 · 다시 읽기 · 이벤트 전송을 묶는 순서를 봅니다. 모두 주입한 대역입니다.

function setup(over: Partial<SplashUpdateControllerDeps> & { promoted?: readonly string[] } = {}) {
  const calls: string[] = [];
  const views: SplashUpdateView[] = [];
  const sent: EpisodeUpdateSplashClosedEvent[] = [];
  const clock = { now: 1000 };
  const promote = vi.fn<() => readonly string[]>(() => {
    calls.push("promote");
    return over.promoted ?? [];
  });
  const reload = vi.fn<() => void>(() => void calls.push("reload"));
  const deps: SplashUpdateControllerDeps = {
    now: () => clock.now,
    startPromoted: 0,
    closedBeforeStart: "no",
    onView: (view) => {
      calls.push("onView");
      views.push(view);
    },
    promote,
    reload,
    send: (event) => {
      calls.push("send");
      sent.push(event);
    },
    ...over,
  };
  return {
    controller: createSplashUpdateController(deps),
    calls,
    views,
    sent,
    clock,
    promote,
    reload,
  };
}

describe("createSplashUpdateController", () => {
  test("SC1. close는 promote → (올린 것이 있으면) reload → send → onView(plain) 순이고 replacedCount는 시작 교체 + 올린 수다", () => {
    const { controller, calls, views, sent, clock } = setup({ promoted: ["a"], startPromoted: 2 });
    controller.observer.planned(["a"]);
    controller.observer.progressed("a", 1, 2);
    clock.now = 3000;
    controller.logoFinished();
    calls.length = 0;
    clock.now = 6000;

    controller.close();

    expect(calls).toEqual(["promote", "reload", "send", "onView"]);
    expect(views.at(-1)).toEqual({ kind: "plain" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      name: "episode_update_splash_closed",
      outcome: "timed-out",
      replacedCount: "3",
      waitMs: "3000",
      splashMs: "5000",
      episodeCount: "1",
    });
  });

  test("SC2. 올린 것이 없으면 reload를 부르지 않고 두 번째 close는 아무것도 부르지 않는다", () => {
    const { controller, calls, promote, reload } = setup({ promoted: [] });
    controller.observer.planned(["a"]);
    calls.length = 0;

    controller.close();
    expect(reload).not.toHaveBeenCalled();
    expect(calls).toContain("promote");
    const afterFirst = [...calls];

    controller.close();

    expect(calls).toEqual(afterFirst);
    expect(promote).toHaveBeenCalledTimes(1);
  });

  test("SC3. 창이 닫힌 채 시작하면 close와 관찰자 신호가 promote · send · onView를 부르지 않는다", () => {
    const { controller, promote, reload, calls } = setup({
      closedBeforeStart: "yes",
      startPromoted: 1,
      promoted: ["a"],
    });

    controller.observer.planned(["a"]);
    controller.observer.progressed("a", 1, 2);
    controller.observer.ready("a");
    controller.finished();
    controller.logoFinished();
    controller.close();

    expect(promote).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  test("SC4. onView는 뷰가 바뀔 때만 부르고 logoFinished는 now()를 waitMs에 반영한다", () => {
    const { controller, views, sent, clock } = setup();

    controller.observer.planned(["a", "b"]);
    expect(views.at(-1)).toEqual({ kind: "gauge", percent: 0, hold: "wait" });
    controller.observer.progressed("a", 1, 5);
    expect(views.at(-1)).toEqual({ kind: "gauge", percent: 10, hold: "wait" });
    const count = views.length;

    controller.observer.progressed("a", 1, 5);
    expect(views).toHaveLength(count);

    clock.now = 4000;
    controller.logoFinished();
    clock.now = 7000;
    controller.close();

    expect(sent[0]?.waitMs).toBe("3000");
    expect(sent[0]?.splashMs).toBe("6000");
  });

  test("SC5. close 뒤에는 관찰자 ready · finished가 와도 promote · reload를 다시 부르지 않는다", () => {
    const { controller, promote, reload, sent } = setup({ promoted: ["a"] });
    controller.observer.planned(["a"]);
    controller.close();
    const promoted = promote.mock.calls.length;
    const reloaded = reload.mock.calls.length;

    controller.observer.progressed("a", 2, 2);
    controller.observer.ready("a");
    controller.finished();

    expect(promoted).toBe(1);
    expect(reloaded).toBe(1);
    expect(promote).toHaveBeenCalledTimes(promoted);
    expect(reload).toHaveBeenCalledTimes(reloaded);
    expect(sent).toHaveLength(1);
  });
});
