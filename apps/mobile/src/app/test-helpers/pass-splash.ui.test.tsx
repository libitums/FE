import { useEffect, useState } from "@lynx-js/react";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, expect, test, vi } from "vitest";

import { entrySplashDurationMs } from "../../lib/entry-flow";
import { passSplash } from "./pass-splash";

// `ui` 계층: 스플래시 안전 타이머가 **늦게** 걸려도 헬퍼가 스플래시를 넘기는지 봅니다.
//
// CI에서 `renderSignedInApp`이 가끔 「스플래시를 지나지 못했다」로 실패했습니다(로컬 재현 0회).
// 헬퍼는 4초를 **한 번만** 앞당겼으므로, 스플래시의 `useEffect`가 그 앞당김보다 늦게 돌아 타이머가
// 늦게 걸리면 타이머가 남습니다. 여기서는 그 늦음을 결정적으로 만듭니다 — effect가 한 박자
// (마이크로태스크) 뒤에야 타이머를 겁니다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function LateSplash({ armAfter }: { readonly armAfter: "now" | "microtask" | "timer" }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      timer = setTimeout(() => setDone(true), entrySplashDurationMs);
    };
    if (armAfter === "now") arm();
    else if (armAfter === "microtask") void Promise.resolve().then(arm);
    else setTimeout(arm, 16);
    return () => clearTimeout(timer);
  }, [armAfter]);
  return done ? <view data-testid="after-splash" /> : <view data-testid="splash-screen-logo" />;
}

test.each(["now", "microtask", "timer"] as const)(
  "PS1. 타이머가 %s에 걸려도 스플래시를 넘긴다",
  async (armAfter) => {
    vi.useFakeTimers();
    render(<LateSplash armAfter={armAfter} />);

    await passSplash();

    expect(screen.queryByTestId("splash-screen-logo")).toBeNull();
    expect(screen.getByTestId("after-splash")).toBeInTheDocument();
  },
);

test("PS2. 끝내 넘지 못하면 정해진 횟수 뒤 분명한 오류로 멈춘다 — 무한히 돌지 않는다", async () => {
  vi.useFakeTimers();
  render(<view data-testid="splash-screen-logo" />);

  await expect(passSplash()).rejects.toThrow("passSplash: 스플래시를 지나지 못했습니다");
});
