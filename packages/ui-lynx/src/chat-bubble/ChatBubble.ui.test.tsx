import { act, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, describe, expect, test, vi } from "vitest";

import { MotionProvider } from "../motion";
import { ChatBubble } from "./index";

afterEach(() => vi.useRealTimers());

test("타이핑 중에도 전체 접근성 이름을 유지하고 완료 후 번역과 완료 이벤트를 낸다", () => {
  vi.useFakeTimers();
  const onRevealComplete = vi.fn<() => void>();
  const view = render(
    <ChatBubble
      direction="incoming"
      speaker="Minseo"
      message="안녕🙂"
      translation="Hi"
      reveal="typewriter"
      onRevealComplete={onRevealComplete}
    />,
  );
  const bubble = screen.getByTestId("ui-lynx-chat-bubble");
  expect(bubble).toHaveAttribute("data-status", "revealing");
  expect(screen.getByTestId("ui-lynx-chat-bubble-measure")).toHaveTextContent("안녕🙂");
  expect(bubble).toHaveAttribute("accessibility-label", "Minseo: 안녕🙂, Hi");
  expect(screen.getByTestId("ui-lynx-chat-bubble-translation")).toHaveStyle({
    visibility: "hidden",
  });
  act(() => {
    vi.advanceTimersByTime(35);
  });
  expect(screen.getByTestId("ui-lynx-chat-bubble-message").textContent).toBe("안");
  expect(onRevealComplete).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(70);
  });
  expect(bubble).toHaveAttribute("data-status", "ready");
  expect(screen.getByTestId("ui-lynx-chat-bubble-translation")).toHaveTextContent("Hi");
  expect(onRevealComplete).toHaveBeenCalledTimes(1);
  view.rerender(
    <ChatBubble
      direction="incoming"
      speaker="Minseo"
      message="안녕🙂"
      translation="Hi"
      reveal="typewriter"
      onRevealComplete={() => onRevealComplete()}
    />,
  );
  expect(onRevealComplete).toHaveBeenCalledTimes(1);
});

test("모션 축소에서는 타이핑을 생략한다", () => {
  render(
    <ChatBubble
      direction="incoming"
      speaker="Minseo"
      message="안녕"
      translation="Hi"
      reveal="typewriter"
      reducedMotion
    />,
  );
  expect(screen.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "ready");
  expect(screen.getByTestId("ui-lynx-chat-bubble-message")).toHaveTextContent("안녕");
  expect(screen.getByTestId("ui-lynx-chat-bubble-translation")).toHaveTextContent("Hi");
});

describe("ChatBubble UI", () => {
  test("Bubble에는 Message만 보이고 실제 화자 이름은 하나의 접근성 node에 합친다", () => {
    render(<ChatBubble direction="incoming" message="오늘 하루는 어땠어?" speaker="말랑이" />);

    const bubble = screen.getByTestId("ui-lynx-chat-bubble");
    expect(bubble).toHaveTextContent("오늘 하루는 어땠어?");
    expect(bubble).not.toHaveTextContent("말랑이");
    expect(bubble).toHaveAttribute("accessibility-element", "true");
    expect(bubble).toHaveAttribute("accessibility-traits", "text");
    expect(bubble).toHaveAttribute("accessibility-label", "말랑이: 오늘 하루는 어땠어?");
    expect(bubble.firstElementChild).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("번역이 있으면 본문 아래에 한 줄 더 그리고, 없으면 그리지 않는다", () => {
    const { unmount } = render(
      <ChatBubble
        direction="incoming"
        message="어서 오세요"
        speaker="직원"
        translation="Welcome"
      />,
    );
    const translation = screen.getByTestId("ui-lynx-chat-bubble-translation");
    expect(translation).toHaveTextContent("Welcome");
    expect(translation).toHaveAttribute("accessibility-element", "false");
    expect(screen.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute(
      "accessibility-label",
      "직원: 어서 오세요, Welcome",
    );
    unmount();

    render(<ChatBubble direction="incoming" message="어서 오세요" speaker="직원" />);
    expect(screen.queryByTestId("ui-lynx-chat-bubble-translation")).toBeNull();
  });

  test("incoming은 시작 방향과 Default delivery를 노출한다", () => {
    render(<ChatBubble direction="incoming" message="안녕하세요" speaker="지민" size="s" />);

    const bubble = screen.getByTestId("ui-lynx-chat-bubble");
    expect(bubble).toHaveAttribute("data-direction", "incoming");
    expect(bubble).toHaveAttribute("data-size", "s");
    expect(bubble).toHaveAttribute("data-delivery", "default");
    expect(bubble).not.toHaveAttribute("accessibility-value");
  });

  test("outgoing delivery를 문구로 연결하지만 Meta row를 Bubble 안에 그리지 않는다", () => {
    render(
      <ChatBubble
        direction="outgoing"
        message="곧 도착해요"
        speaker="나"
        size="l"
        delivery="failed"
      />,
    );

    const bubble = screen.getByTestId("ui-lynx-chat-bubble");
    expect(bubble).toHaveAttribute("data-direction", "outgoing");
    expect(bubble).toHaveAttribute("data-delivery", "failed");
    expect(bubble).toHaveAttribute("accessibility-value", "Couldn't send");
    expect(bubble).not.toHaveTextContent("Couldn't send");
  });

  test("학습 콘텐츠 언어 종류와 tag를 소비자 결선용 metadata로 보존한다", () => {
    render(
      <ChatBubble
        direction="incoming"
        message="See you tomorrow."
        speaker="Mina"
        contentLanguage="learning"
        languageTag="en-US"
      />,
    );

    const bubble = screen.getByTestId("ui-lynx-chat-bubble");
    expect(bubble).toHaveAttribute("data-language", "learning");
    expect(bubble).toHaveAttribute("data-lang", "en-US");
  });

  test("Bubble 전체를 button으로 만들거나 tap handler를 연결하지 않는다", () => {
    render(<ChatBubble direction="outgoing" message="네" speaker="나" />);

    const bubble = screen.getByTestId("ui-lynx-chat-bubble");
    expect(bubble).not.toHaveAttribute("bindtap");
    expect(bubble).not.toHaveAttribute("accessibility-traits", "button");
  });
});

describe("ChatBubble motion 컨텍스트", () => {
  test("CB1: reduced Provider에서 reducedMotion prop이 없으면 첫 렌더에서 전체가 서고 타이머가 없다", () => {
    vi.useFakeTimers();
    const onRevealComplete = vi.fn<() => void>();
    render(
      <MotionProvider motion="reduced">
        <ChatBubble
          direction="incoming"
          speaker="Minseo"
          message="안녕🙂"
          translation="Hi"
          reveal="typewriter"
          onRevealComplete={onRevealComplete}
        />
      </MotionProvider>,
    );

    expect(screen.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "ready");
    expect(screen.getByTestId("ui-lynx-chat-bubble-message")).toHaveTextContent("안녕🙂");
    expect(screen.getByTestId("ui-lynx-chat-bubble-translation")).toHaveTextContent("Hi");
    expect(onRevealComplete).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("CB2: 명시한 reducedMotion={false}가 reduced Provider를 이겨 revealing에서 시작한다", () => {
    vi.useFakeTimers();
    render(
      <MotionProvider motion="reduced">
        <ChatBubble
          direction="incoming"
          speaker="Minseo"
          message="안녕🙂"
          reveal="typewriter"
          reducedMotion={false}
        />
      </MotionProvider>,
    );

    expect(screen.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "revealing");
  });
});
