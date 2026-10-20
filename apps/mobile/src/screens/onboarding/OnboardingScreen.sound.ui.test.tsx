import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { OnboardingScreen } from "./OnboardingScreen";

afterEach(() => vi.unstubAllGlobals());

test("온보딩의 다음·뒤로·시작 버튼은 탭마다 가벼운 버튼음을 낸다", () => {
  const sounds: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: (id: string) => sounds.push(id), stopRing: () => {} },
  });
  render(<OnboardingScreen onComplete={() => sounds.push("complete")} />);

  const next = () =>
    fireEvent.tap(
      within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
      {},
    );
  next();
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  next();
  next();
  next();

  expect(sounds).toEqual(["button", "button", "button", "button", "button", "complete"]);
});
