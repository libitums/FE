// 모바일 전체화면 — 첫 탭에 주소창 · 탭바를 숨기고, 완료 · 나가기에서 풉니다. 지원하지 않으면(iPhone Safari) 아무 일도 없고,
// 거부 · 던짐은 삼킵니다. 데스크톱(가는 포인터 · hover)은 부르지 않습니다 — 폰 틀 그대로.

import type { CreateTrialFullscreen, FullscreenWanted } from "./trial-ports.contract";

type FullscreenCall = (this: unknown, options?: unknown) => unknown;
type Vendor = {
  requestFullscreen?: FullscreenCall;
  webkitRequestFullscreen?: FullscreenCall;
  fullscreenElement?: unknown;
  webkitFullscreenElement?: unknown;
  exitFullscreen?: FullscreenCall;
  webkitExitFullscreen?: FullscreenCall;
};

export const fullscreenWanted: FullscreenWanted = (env) => env.coarsePointer && env.noHover;

function matches(scope: Window, query: string): boolean {
  try {
    return scope.matchMedia?.(query).matches ?? false;
  } catch {
    return false;
  }
}

/** 부르고, 돌아온 Promise의 거부까지 삼킵니다. */
function quietly(call: FullscreenCall | undefined, target: unknown, options?: unknown): void {
  if (typeof call !== "function") return;
  try {
    const result = call.call(target, options) as { catch?: (onRejected: () => void) => unknown };
    if (result && typeof result.catch === "function") result.catch(() => undefined);
  } catch {
    // 막힌 환경(iframe · 권한) — 지금처럼 둡니다.
  }
}

export const createTrialFullscreen: CreateTrialFullscreen = (scope) => {
  let requested = false;
  return {
    request() {
      if (requested) return;
      requested = true;
      const wanted = fullscreenWanted({
        coarsePointer: matches(scope, "(pointer: coarse)"),
        noHover: matches(scope, "(hover: none)"),
      });
      const element = scope.document?.documentElement as (Element & Vendor) | undefined;
      if (!wanted || element === undefined) return;
      quietly(element.requestFullscreen ?? element.webkitRequestFullscreen, element, {
        navigationUI: "hide",
      });
    },
    exit() {
      const doc = scope.document as (Document & Vendor) | undefined;
      if (doc === undefined) return;
      if ((doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null) === null) return;
      quietly(doc.exitFullscreen ?? doc.webkitExitFullscreen, doc);
    },
  };
};
