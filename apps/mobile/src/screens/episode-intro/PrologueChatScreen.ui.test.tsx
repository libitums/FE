import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { PrologueChat } from "./episode-intro.contract";
import { PrologueChatScreen } from "./PrologueChatScreen";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 대본은 이 파일 안의 fixture로
// 줍니다. 상대 메시지는 1.5초 뒤 옵니다.

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const chat: PrologueChat = {
  partnerName: "Yuna",
  messages: [
    { id: "m1", sender: "other", text: "한국에는 잘 도착했어?", translation: "Did you arrive?" },
    { id: "m2", sender: "self", text: "잘 도착했어요!", translation: "I made it safely!" },
    { id: "m3", sender: "other", text: "부탁 하나 해도 될까?", translation: "Can I ask a favor?" },
  ],
};

function renderChat() {
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 1.",
    chat,
    onComplete: vi.fn<() => void>(),
    onBack: vi.fn<() => void>(),
  };
  render(<PrologueChatScreen {...props} />);
  return props;
}

function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function shownIds(): readonly (string | null)[] {
  return Array.from(screen.getByTestId("prologue-chat-screen-list").children).map((el) =>
    el.getAttribute("data-testid"),
  );
}

test("[CH1] 머리가 서고 처음에는 메시지가 없다", () => {
  renderChat();

  expect(screen.getByTestId("prologue-chat-screen-title")).toHaveTextContent("Episode 1.");
  expect(screen.getByTestId("prologue-chat-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
  expect(shownIds()).toEqual([]);
});

test("[CH2] 상대 메시지가 저절로 오고, 내 차례에는 입력창에 보낼 말이 채워진다", () => {
  vi.useFakeTimers();
  renderChat();

  wait(1500);

  expect(shownIds()).toEqual(["prologue-chat-screen-message-m1"]);
  expect(screen.getByTestId("prologue-chat-screen-message-m1")).toHaveAttribute(
    "data-sender",
    "other",
  );
  expect(screen.getByTestId("prologue-chat-screen-draft")).toHaveTextContent("잘 도착했어요!");
  const send = screen.getByTestId("prologue-chat-screen-send");
  expect(send).toHaveAttribute("accessibility-traits", "button");
  expect(send).toHaveAttribute("accessibility-label", "Send, 잘 도착했어요!");
});

test("[CH3] 내 차례에는 기다린다 — 보내기 전에는 다음 메시지가 오지 않는다", () => {
  vi.useFakeTimers();
  renderChat();

  wait(1500);
  wait(10_000);

  expect(shownIds()).toEqual(["prologue-chat-screen-message-m1"]);
});

test("[CH4] 보내기를 누르면 내 메시지가 오른쪽에 서고 다음 상대 메시지가 이어진다", () => {
  vi.useFakeTimers();
  renderChat();
  wait(1500);

  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});

  expect(screen.getByTestId("prologue-chat-screen-message-m2")).toHaveAttribute(
    "data-sender",
    "self",
  );
  expect(screen.getByTestId("prologue-chat-screen-draft")).toHaveTextContent("");
  expect(screen.getByTestId("prologue-chat-screen-send")).toHaveAttribute(
    "accessibility-traits",
    "disabled",
  );
  wait(1500);
  expect(shownIds()).toEqual([
    "prologue-chat-screen-message-m1",
    "prologue-chat-screen-message-m2",
    "prologue-chat-screen-message-m3",
  ]);
});

test("[CH5] 보낼 말이 없을 때 보내기를 눌러도 아무 일이 없다", () => {
  vi.useFakeTimers();
  renderChat();

  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});

  expect(shownIds()).toEqual([]);
});

test("[CH6] 대화가 끝나면 입력창이 걷히고 하단에 Continue가 선다 — 저절로 넘어가지 않는다", () => {
  vi.useFakeTimers();
  const props = renderChat();
  wait(1500);
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});
  wait(1500);

  expect(screen.queryByTestId("prologue-chat-screen-composer")).not.toBeInTheDocument();
  const complete = screen.getByTestId("prologue-chat-screen-complete");
  expect(complete).toHaveTextContent("Continue");
  expect(complete).toHaveAttribute("accessibility-traits", "button");
  expect(props.onComplete).not.toHaveBeenCalled();

  fireEvent.tap(complete, {});
  expect(props.onComplete).toHaveBeenCalledTimes(1);
});

test("[CH7] 뒤로 tap → onBack 1회, onComplete 0회", () => {
  const props = renderChat();

  fireEvent.tap(
    within(screen.getByTestId("prologue-chat-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(props.onBack).toHaveBeenCalledTimes(1);
  expect(props.onComplete).not.toHaveBeenCalled();
});

test("[CH8] 메시지가 늘 때마다 대화 끝의 여백으로 스크롤한다 — 처음에는 하지 않는다", () => {
  // 호스트의 질의는 jsdom에 없으므로 대역을 세워 부른 것만 적습니다.
  const invocations: { selector: string; method: string }[] = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: { method: string }) => ({
            exec: () => invocations.push({ selector, method: options.method }),
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
  vi.useFakeTimers();
  renderChat();
  expect(invocations).toEqual([]);

  wait(1500);
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});

  expect(invocations).toEqual([
    { selector: "#prologue-chat-screen-end", method: "scrollIntoView" },
    { selector: "#prologue-chat-screen-end", method: "scrollIntoView" },
  ]);
});

test("[ST3-E] 화자 이름이 영어다 — 상대는 Yuna, 나는 Me", () => {
  vi.useFakeTimers();
  renderChat();
  wait(1500);
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});

  const other = within(screen.getByTestId("prologue-chat-screen-message-m1")).getByTestId(
    "ui-lynx-chat-bubble",
  );
  const mine = within(screen.getByTestId("prologue-chat-screen-message-m2")).getByTestId(
    "ui-lynx-chat-bubble",
  );
  expect(other).toHaveAttribute("accessibility-label", expect.stringContaining("Yuna"));
  expect(mine).toHaveAttribute("accessibility-label", expect.stringContaining("Me"));
});

test("[ST3-M] 문구표에서 읽는다 — 보내기 이름 · 내 화자 · 뒤로", () => {
  vi.useFakeTimers();
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <PrologueChatScreen
        insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
        episodeLabel="Episode 1."
        chat={chat}
        onComplete={vi.fn<() => void>()}
        onBack={vi.fn<() => void>()}
      />
    </UiCopyContext.Provider>,
  );
  wait(1500);

  expect(screen.getByTestId("prologue-chat-screen-send")).toHaveAttribute(
    "accessibility-label",
    "⟦common.sendWithText⟧(잘 도착했어요!)",
  );
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});
  expect(
    within(screen.getByTestId("prologue-chat-screen-message-m2")).getByTestId(
      "ui-lynx-chat-bubble",
    ),
  ).toHaveAttribute("accessibility-label", expect.stringContaining("⟦common.me⟧"));
  expect(
    within(screen.getByTestId("prologue-chat-screen-back")).getByTestId("ui-lynx-round-button"),
  ).toHaveAttribute("accessibility-label", "⟦common.exitTo.journey⟧");
});
