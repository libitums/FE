import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { StepSheet } from "./StepSheet";

afterEach(() => vi.unstubAllGlobals());

test("여정의 시작 탭은 작은 버튼음을 한 번 낸 뒤 학습을 시작한다", () => {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: {
      play: (id: string) => calls.push(`sound:${id}`),
      stopRing: () => {},
    },
  });
  render(
    <StepSheet
      title="Ordering"
      top={0}
      lessonOrdinal={1}
      completedActivityCount={0}
      totalActivityCount={3}
      onStart={() => calls.push("start")}
      onClose={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(calls).toEqual(["sound:button", "start"]);
});
