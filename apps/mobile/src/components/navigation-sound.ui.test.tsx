import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { BottomNavigator } from "./BottomNavigator";
import { CultureScreen } from "../screens/culture/CultureScreen";

afterEach(() => vi.unstubAllGlobals());

function soundCalls(): string[] {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: {
      play: (id: string) => calls.push(`sound:${id}`),
      stopRing: () => {},
    },
  });
  return calls;
}

test("하단 탭을 누르면 작은 버튼음 뒤에 화면을 바꾼다", () => {
  const calls = soundCalls();
  render(<BottomNavigator tab="journey" onSelectTab={(tab) => calls.push(`tab:${tab}`)} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(calls).toEqual(["sound:button", "tab:settings"]);
});

test("문화 퀴즈 시작 버튼도 판정음 없이 버튼음 한 번만 낸다", () => {
  const calls = soundCalls();
  render(
    <CultureScreen
      stepOrdinal={1}
      narrative={{ title: "Culture", paragraphs: ["Story"] }}
      onExit={() => {}}
      onStartQuiz={() => calls.push("start-quiz")}
    />,
  );

  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(calls).toEqual(["sound:button", "start-quiz"]);
});
