import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import { FirstUnitGuideProvider } from "./first-unit-guide";
import { CallScreen } from "./CallScreen";
import { PrologueCallScreen } from "../screens/episode-intro/PrologueCallScreen";

// `ui` 계층: 학습 문항 안내가 위를 덮는 동안 통화 화면 루트를 낭독에서 가리는 `obscured`.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function callScreen(obscured?: boolean) {
  return (
    <CallScreen
      title="A Call"
      status="Incoming call…"
      phase="incoming"
      callerName="Minseo"
      callerPortrait={null}
      clockRunning={false}
      exitLabel="Back to journey"
      onBack={() => {}}
      testId="call-screen-root"
      testIdPrefix="call-screen"
      backTestId="call-screen-back"
      actions={<text>actions</text>}
      {...(obscured === undefined ? {} : { obscured })}
    />
  );
}

test("[OB3] obscured={true}면 루트가 낭독에서 가려지고, {false}면 false가 쓰이고, 안 넘기면 속성이 없다", () => {
  const view = render(callScreen(true));
  expect(screen.getByTestId("call-screen-root")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  view.rerender(callScreen(false));
  expect(screen.getByTestId("call-screen-root")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );

  view.rerender(callScreen());
  expect(screen.getByTestId("call-screen-root")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
});

test("[FG2] 서사 통화(PrologueCallScreen)를 안내 없이 세우면 루트에 낭독 가림 속성이 없다", () => {
  render(
    <FirstUnitGuideProvider enabled={false}>
      <PrologueCallScreen
        insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
        episodeLabel="Episode 0."
        call={{ callerName: "Minseo", lines: [{ text: "여보세요?", translation: "Hello?" }] }}
        callerPortrait="portrait.png"
        onComplete={() => {}}
        onBack={() => {}}
      />
    </FirstUnitGuideProvider>,
  );

  expect(screen.getByTestId("prologue-call-screen")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
});
