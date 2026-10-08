import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import type { PrologueCall } from "./episode-intro.contract";
import { PrologueCallScreen } from "./PrologueCallScreen";

const call: PrologueCall = {
  callerName: "Minseo",
  lines: [{ text: "여보세요?", translation: "Hello?" }],
};

function stubSoundHost(): string[] {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: () => {}, stopRing: () => calls.push("stopRing") },
  });
  return calls;
}

function callScreen(overrides: { guided?: boolean; onBack: () => void }) {
  return (
    <PrologueCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 0."
      call={call}
      callerPortrait="portrait.png"
      onComplete={vi.fn<() => void>()}
      {...overrides}
    />
  );
}

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[US16] 안내 없음 → 뒤로가기는 onBack 1회 · stopRing 호출", () => {
  const rings = stubSoundHost();
  const onBack = vi.fn<() => void>();
  render(callScreen({ onBack }));
  rings.length = 0;

  expect(pressBack()).toBe(true);

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(rings.length).toBeGreaterThanOrEqual(1);
});

test("[UL8] 첫 유닛 안내가 뜬 통화 → 뒤로가기는 안내만 넘기고 화면의 onBack은 0회", () => {
  stubSoundHost();
  const onBack = vi.fn<() => void>();
  render(
    <FirstUnitGuideProvider enabled>{callScreen({ guided: true, onBack })}</FirstUnitGuideProvider>,
  );
  expect(screen.getByTestId("first-unit-guide-call")).toBeInTheDocument();

  expect(pressBack()).toBe(true);

  expect(screen.queryByTestId("first-unit-guide-call")).not.toBeInTheDocument();
  expect(onBack).not.toHaveBeenCalled();
});
