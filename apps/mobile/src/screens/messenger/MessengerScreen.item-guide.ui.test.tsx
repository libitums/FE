import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import { messengerConversationFor } from "./messenger";
import type { MessengerConversation } from "./messenger.contract";
import { messengerCorrectDelayMs } from "./messenger-composer";
import { MessengerScreen } from "./MessengerScreen";

// `ui` 계층: 메신저 화면의 학습 문항 안내. 첫 답장의 보기가 하나일 때만 뜨고, 떠 있는 동안
// 대화에 메시지가 서지 않으며 보기 · 보내기가 상태를 바꾸지 않는다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

const conversation = messengerConversationFor("appointment-confirmation");

function withFirstReplyChoices(choices: readonly string[] | undefined): MessengerConversation {
  const [first, reply, ...rest] = conversation.messages;
  return {
    ...conversation,
    messages: [
      first,
      { ...reply, choices },
      ...rest,
    ] as unknown as MessengerConversation["messages"],
  };
}

function renderScreen(target: MessengerConversation = conversation) {
  const props = {
    onExit: vi.fn(),
    onComplete: vi.fn<() => void>(),
    onFinish: vi.fn(),
  };
  render(<MessengerScreen conversation={target} completionStatus="available" {...props} />);
  return props;
}

const guide = () => screen.queryByTestId("learning-item-guide-messenger");
const screenRoot = () => screen.getByTestId("messenger-screen");
// `messenger-message-list` is the list container, not a message bubble.
const messageIds = () =>
  screen
    .queryAllByTestId(/^messenger-message-(?!list$)/)
    .map((node) => node.getAttribute("data-testid"));
const choiceText = conversation.messages[1].choices?.[0] ?? "";
const tapGuide = () =>
  fireEvent.tap(screen.getByTestId("learning-item-guide-messenger"), { eventType: "catchEvent" });
const pressBack = (): boolean => {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
};

test("[SC1·MS] 안 본 저장소에서 메신저를 열면 안내가 하나 서고, 화면 루트가 가려지며, 안내는 루트의 자손이 아니다", () => {
  stubGuideStorage();
  renderScreen();

  expect(guideRoots()).toHaveLength(1);
  expect(screenRoot()).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(screenRoot().contains(guide())).toBe(false);
});

test("[SC2·MS] 안내를 탭하면 사라지고, 루트의 가림은 false로 남으며, 그 종류가 저장된다", () => {
  const double = stubGuideStorage();
  renderScreen();

  tapGuide();

  expect(guide()).toBeNull();
  expect(screenRoot()).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(double.savedKinds()).toEqual(["messenger"]);
});

test("[SC3·MS] 뒤로가기 한 번은 안내만 닫고, 한 번 더는 화면의 닫기(onExit)다", () => {
  stubGuideStorage();
  const props = renderScreen();

  expect(pressBack()).toBe(true);
  expect(guide()).toBeNull();
  expect(props.onExit).not.toHaveBeenCalled();
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();

  expect(pressBack()).toBe(true);
  expect(props.onExit).toHaveBeenCalledTimes(1);
  expect(props.onExit).toHaveBeenCalledWith("incomplete");
});

test("[SC4·MS] 그 종류를 이미 봤으면 안내가 없고 루트가 가려지지 않는다", () => {
  stubGuideStorage({ seen: ["messenger"] });
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
  expect(screenRoot().getAttribute("accessibility-elements-hidden")).not.toBe("true");
});

test("[SC5·MS] 저장소가 없으면 안내가 없다", () => {
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
});

test("[MS6] 떠 있는 동안 메시지가 0개이고 보기 · 보내기가 상태를 바꾸지 않으며, 닫으면 첫 메시지가 서고 대화가 이어진다", () => {
  vi.useFakeTimers();
  stubGuideStorage();
  renderScreen();
  expect(guide()).not.toBeNull();

  expect(messageIds()).toEqual([]);
  fireEvent.tap(screen.getByTestId(`messenger-choice-${choiceText}`), {});
  expect(screen.getByTestId(`messenger-choice-${choiceText}`)).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("messenger-composer-text")).not.toHaveTextContent(choiceText);
  fireEvent.tap(screen.getByTestId("messenger-send"), {});
  expect(screen.getByTestId("messenger-composer")).toHaveAttribute("data-verdict", "typing");
  act(() => {
    vi.advanceTimersByTime(messengerCorrectDelayMs * 2);
  });
  expect(messageIds()).toEqual([]);

  tapGuide();
  expect(messageIds()).toEqual(["messenger-message-jimin-schedule"]);
  fireEvent.tap(screen.getByTestId(`messenger-choice-${choiceText}`), {});
  expect(screen.getByTestId(`messenger-choice-${choiceText}`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  fireEvent.tap(screen.getByTestId("messenger-send"), {});
  expect(screen.getByTestId("messenger-composer")).toHaveAttribute("data-verdict", "correct");
  act(() => {
    vi.advanceTimersByTime(messengerCorrectDelayMs);
  });
  expect(messageIds()).toContain("messenger-message-self-accept");
});

test.each([
  ["보기가 둘", ["안녕하세요", "좋아요"]],
  ["보기가 없음(자판)", undefined],
] as const)("[MS7] 첫 답장의 %s이면 안내가 없고 안내 키에 쓰지 않는다", (_name, choices) => {
  const double = stubGuideStorage();
  renderScreen(withFirstReplyChoices(choices));

  expect(guideRoots()).toHaveLength(0);
  expect(double.set).not.toHaveBeenCalled();
});
