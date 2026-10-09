import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { FirstUnitGuideProvider } from "../../components/first-unit-guide";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import type { PrologueChat } from "./episode-intro.contract";
import { PrologueChatScreen } from "./PrologueChatScreen";

// `ui` 계층: 채팅 화면은 밝은 화면이라 표지를 달지 않습니다. 첫 단원 안내가 뜨면 그 안내만
// 표지를 집니다(계약 3.2 · r02.2).

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

const chat: PrologueChat = {
  partnerName: "Yuna",
  messages: [
    { id: "m1", sender: "other", text: "한국에는 잘 도착했어?", translation: "Did you arrive?" },
  ],
};

function chatScreen(guided = false) {
  return (
    <PrologueChatScreen
      guided={guided}
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 1."
      chat={chat}
      onComplete={vi.fn<() => void>()}
      onBack={vi.fn<() => void>()}
    />
  );
}

test("UT8: 안내 없는 채팅 화면에는 표지가 없다", () => {
  render(chatScreen());

  expect(markers()).toHaveLength(0);
});

test("UT13: 안내가 뜬 채팅은 표지가 안내 하나고 닫으면 0개다", () => {
  render(<FirstUnitGuideProvider enabled>{chatScreen(true)}</FirstUnitGuideProvider>);

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId("first-unit-guide-messenger"));

  fireEvent.tap(screen.getByTestId("first-unit-guide-messenger"), { eventType: "catchEvent" });

  expect(markers()).toHaveLength(0);
});
