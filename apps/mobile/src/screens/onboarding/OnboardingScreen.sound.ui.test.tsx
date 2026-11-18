import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { OnboardingScreen } from "./OnboardingScreen";

afterEach(() => vi.unstubAllGlobals());

test("온보딩의 뒤로·시작 버튼은 탭마다 가벼운 버튼음을 내고, 밀기는 소리가 없다", () => {
  const sounds: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: (id: string) => sounds.push(id), stopRing: () => {} },
  });
  render(<OnboardingScreen onComplete={() => sounds.push("complete")} />);

  const pager = screen.getByTestId("onboarding-screen-pager");
  fireEvent.touchstart(pager, { touches: [{ pageX: 300, pageY: 200 }] });
  fireEvent.touchmove(pager, { touches: [{ pageX: 220, pageY: 204 }] });
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-start")).getByTestId("ui-lynx-button"),
    {},
  );

  expect(sounds).toEqual(["button", "button", "complete"]);
});
