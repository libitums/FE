import { createContext, useContext } from "@lynx-js/react";
import type { Context } from "@lynx-js/react";
import type { Motion } from "@libitums/ui-lynx/motion";

import type { SplashCopy, SplashUpdatePort, SplashUpdateView } from "./splash.contract";

// 스플래시가 받는 갱신 포트의 context입니다. Provider가 없으면 게이지 없는 포트라
// 지금 동작 그대로입니다. 메인 스레드가 닿는 모듈이라 background-only 모듈을 값으로
// 가져오지 않습니다.

function noop(): void {
  // 포트가 없을 때는 알릴 곳이 없습니다.
}

export const plainSplashUpdate: SplashUpdatePort = {
  view: { kind: "plain" },
  logoFinished: noop,
  close: noop,
};

export const SplashUpdateContext: Context<SplashUpdatePort> = createContext(plainSplashUpdate);

export function useSplashUpdate(): SplashUpdatePort {
  return useContext(SplashUpdateContext);
}

/** plain이거나 gauge · release면 나가도 됩니다. */
export function splashMayLeave(view: SplashUpdateView): boolean {
  return view.kind === "plain" || view.hold === "release";
}

/** 채움 폭입니다. 0 이하(또는 NaN)면 null이라 채움 요소를 두지 않습니다. */
export function splashGaugeFillWidth(percent: number): string | null {
  if (!(percent > 0)) return null;
  if (percent >= 100) return "100%";
  return `${Math.floor(percent)}%`;
}

export function splashUpdateClassName(motion: Motion): string {
  return motion === "reduced" ? "splash-update splash-update-motion-reduced" : "splash-update";
}

/** 게이지가 처음 나타났을 때 한 번 알릴 문구입니다. 퍼센트는 싣지 않고, 그 밖에는 null입니다. */
export function splashUpdateAnnouncement(
  view: SplashUpdateView,
  announced: "yes" | "no",
  copy: SplashCopy,
): string | null {
  if (view.kind !== "gauge" || announced === "yes") return null;
  return copy.updating;
}
