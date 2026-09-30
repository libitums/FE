import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MessageBubble } from "./MessageBubble";
import { MessengerScreen } from "./MessengerScreen";
import { MessengerFinishButton } from "./MessengerFinishButton";
import { keyboardConversation as conversation } from "./messenger-keyboard-fixture.test-support";
import { messengerCorrectDelayMs } from "./messenger-composer";
import { sendMessengerReply, typeMessengerReply } from "./messenger.test-support";

// `ui` 계층: 실제 컴포넌트를 렌더하고 자판 · 판정 · 대화 전개를 봅니다(ADR-0006 D4).

function renderActive(onComplete = vi.fn(), onFinish = vi.fn()) {
  render(
    <MessengerScreen
      conversation={conversation}
      completionStatus="available"
      onExit={vi.fn()}
      onComplete={onComplete}
      onFinish={onFinish}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("messenger UI components", () => {
  it("새 상대 메시지만 타이핑하고 내 답장과 과거 메시지는 즉시 표시한다", () => {
    renderActive();
    const first = within(screen.getByTestId("messenger-message-jimin-schedule"));
    expect(first.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "revealing");
    act(() => {
      vi.advanceTimersByTime(35);
    });
    expect(first.getByTestId("ui-lynx-chat-bubble-message").textContent).toBe("토");
    sendMessengerReply("좋아요!");
    expect(first.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "ready");
    const mine = within(screen.getByTestId("messenger-message-self-accept"));
    expect(mine.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "ready");
    expect(mine.getByTestId("ui-lynx-chat-bubble-message")).toHaveTextContent("좋아요!");
    const next = within(screen.getByTestId("messenger-message-jimin-directions"));
    expect(next.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "revealing");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(next.getByTestId("ui-lynx-chat-bubble")).toHaveAttribute("data-status", "ready");
    expect(next.getByTestId("ui-lynx-chat-bubble-translation")).toBeInTheDocument();
  });

  it("완료한 대화 기록은 타이핑 없이 모두 보여준다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="completed"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onFinish={vi.fn()}
      />,
    );
    for (const bubble of screen.getAllByTestId("ui-lynx-chat-bubble")) {
      expect(bubble).toHaveAttribute("data-status", "ready");
    }
    expect(screen.getAllByTestId("ui-lynx-chat-bubble-translation")).toHaveLength(5);
  });

  it("MessageBubble은 지민 메시지의 문구 · 번역과 sender를 표시한다", () => {
    render(<MessageBubble message={conversation.messages[0]} />);
    const bubble = screen.getByTestId("messenger-message-jimin-schedule");
    expect(bubble).toHaveTextContent("토요일 오후 2시에 역 앞 카페에서 만나요.");
    expect(bubble).toHaveTextContent(conversation.messages[0].translation);
    expect(bubble).toHaveAttribute("data-sender", "jimin");
    expect(within(bubble).getByTestId("ui-lynx-chat-bubble")).toHaveAttribute(
      "accessibility-label",
      expect.stringContaining("Minseo"),
    );
  });

  it("MessengerFinishButton은 결과 보기 콜백을 호출한다", () => {
    const onFinish = vi.fn();
    render(<MessengerFinishButton onFinish={onFinish} />);
    fireEvent.tap(screen.getByTestId("messenger-finish"), {});
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("MessengerScreen은 제목·나가기·스크롤 표면을 낸다", () => {
    renderActive();
    expect(screen.getByTestId("messenger-screen-title")).toHaveTextContent("A Message from Minseo");
    expect(screen.getByTestId("messenger-screen-scroll")).toHaveAttribute(
      "scroll-orientation",
      "vertical",
    );
  });

  it("MessengerScreen의 맵으로 행동은 미완료 이탈을 올린다", () => {
    const onExit = vi.fn();
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={onExit}
        onComplete={vi.fn()}
        onFinish={vi.fn()}
      />,
    );
    fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});
    expect(onExit).toHaveBeenCalledWith("incomplete");
  });

  it("초기 세션은 첫 메시지와, 초성으로 가린 정답 · 뜻을 힌트로 둔 빈 입력창 · 자판을 낸다", () => {
    renderActive();
    expect(screen.getByTestId("messenger-message-list").children).toHaveLength(1);
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent("ㅈㅇㅇ!");
    expect(screen.getByTestId("messenger-composer-hint")).toHaveTextContent("Sounds good!");
    expect(screen.getByTestId("messenger-composer")).toHaveAttribute("data-verdict", "typing");
    expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
    expect(screen.getByTestId("messenger-send")).toHaveAttribute(
      "accessibility-traits",
      "disabled",
    );
  });

  it("자판으로 친 자모가 음절로 조합되어 입력창에 선다", () => {
    renderActive();
    for (const key of ["ㅈ", "ㅗ", "ㅎ", "ㅇ", "ㅏ"]) {
      fireEvent.tap(screen.getByTestId(`messenger-key-${key}`), {});
    }
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent("좋아");
    // 치기 시작하면 가린 정답이 힌트 줄로 옮겨 가 계속 보입니다.
    expect(screen.getByTestId("messenger-composer-hint")).toHaveTextContent(
      "ㅈㅇㅇ! · Sounds good!",
    );
    // 지우기는 키 하나를 뺍니다 — `ㅏ`가 빠지면 넘어갔던 `ㅇ`이 홀로 남습니다.
    fireEvent.tap(screen.getByTestId("messenger-key-backspace"), {});
    expect(screen.getByTestId("messenger-send")).toHaveAttribute(
      "accessibility-label",
      "Send, 좋ㅇ",
    );
  });

  it("윗글쇠를 켜면 키 이름이 겹자음으로 바뀌고 한 번 친 뒤 꺼진다", () => {
    renderActive();
    fireEvent.tap(screen.getByTestId("messenger-key-shift"), {});
    expect(screen.getByTestId("messenger-key-ㄱ")).toHaveTextContent("ㄲ");
    fireEvent.tap(screen.getByTestId("messenger-key-ㄱ"), {});
    expect(screen.getByTestId("messenger-key-shift")).toHaveAttribute("data-shifted", "false");
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent("ㄲ");
  });

  it("맞게 치면 정답 배지 · 초록 입력창이 서고, 틈 뒤 답장과 다음 메시지가 대화에 선다", () => {
    renderActive();
    typeMessengerReply("좋아요");
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
    expect(screen.getByTestId("messenger-composer")).toHaveAttribute("data-verdict", "correct");
    expect(screen.getByTestId("messenger-message-list").children).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(messengerCorrectDelayMs);
    });

    expect(screen.getByTestId("messenger-message-self-accept")).toHaveTextContent("좋아요!");
    expect(
      within(screen.getByTestId("messenger-message-self-accept")).getByTestId(
        "ui-lynx-chat-bubble",
      ),
    ).toHaveAttribute("accessibility-label", expect.stringContaining("Me"));
    expect(screen.getByTestId("messenger-message-jimin-directions")).toBeInTheDocument();
    expect(screen.queryByTestId("answer-verdict")).toBeNull();
    // 둘째 답장은 객관식입니다 — 자판 자리에 보기가 서고, 정답을 가려 보이지 않습니다.
    expect(screen.getByTestId("messenger-choices")).toBeInTheDocument();
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent(
      "Choose a reply, then send.",
    );
    expect(screen.getByTestId("messenger-composer-hint")).toHaveTextContent("Thank you!");
  });

  it("틀리면 오답 배지와 Try Again이 자판 자리에 서고, 누르면 비운 입력으로 다시 친다", () => {
    renderActive();
    typeMessengerReply("조아요");
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(messengerCorrectDelayMs * 2);
    });
    expect(screen.getByTestId("messenger-message-list").children).toHaveLength(1);

    fireEvent.tap(screen.getByTestId("messenger-try-again").querySelector("view")!, {});
    expect(screen.getByTestId("messenger-composer")).toHaveAttribute("data-verdict", "typing");
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent("ㅈㅇㅇ!");
    expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
  });

  it("두 답장을 맞히면 마지막 수신 메시지와 완료 callback을 내고 자판이 걷힌다", () => {
    const onComplete = vi.fn();
    renderActive(onComplete);
    sendMessengerReply("좋아요!");
    sendMessengerReply("고마워요!");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("messenger-message-jimin-goodbye")).toHaveTextContent(
      "그럼 토요일에 봬요!",
    );
    expect(onComplete).toHaveBeenCalledWith("appointment-confirmation");
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    expect(screen.queryByTestId("messenger-choices")).toBeNull();
    expect(screen.getByTestId("messenger-finish")).toBeInTheDocument();
  });

  it("결과 보기는 답장마다 첫 시도의 정오를 싣는다 — 모두 한 번에 맞히면 전부 정답이다", () => {
    const onFinish = vi.fn();
    renderActive(vi.fn(), onFinish);
    sendMessengerReply("좋아요!");
    sendMessengerReply("고마워요!");
    fireEvent.tap(screen.getByTestId("messenger-finish"), {});
    expect(onFinish).toHaveBeenCalledWith("appointment-confirmation", ["correct", "correct"]);
  });

  it("틀린 뒤 다시 맞힌 답장은 오답으로 남는다", () => {
    const onFinish = vi.fn();
    renderActive(vi.fn(), onFinish);
    typeMessengerReply("조아요");
    fireEvent.tap(screen.getByTestId("messenger-try-again").querySelector("view")!, {});
    sendMessengerReply("좋아요!");
    sendMessengerReply("고마워요!");
    fireEvent.tap(screen.getByTestId("messenger-finish"), {});
    expect(onFinish).toHaveBeenCalledWith("appointment-confirmation", ["incorrect", "correct"]);
  });

  it("판정 틈에 화면을 떠나면 답장이 서지 않는다", () => {
    const onComplete = vi.fn();
    const view = render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={vi.fn()}
        onComplete={onComplete}
        onFinish={vi.fn()}
      />,
    );
    typeMessengerReply("좋아요");
    view.unmount();
    act(() => {
      vi.advanceTimersByTime(messengerCorrectDelayMs);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("객관식 답장은 보기를 고르면 입력창에 서고, 틀린 보기는 오답 · 맞는 보기는 정답이다", () => {
    renderActive();
    sendMessengerReply("좋아요!");
    const choices = screen.getByTestId("messenger-choices");
    expect(choices.children).toHaveLength(4);
    expect(screen.getByTestId("messenger-composer-prompt")).toHaveTextContent(
      "Choose a reply, then send.",
    );

    fireEvent.tap(screen.getByTestId("messenger-choice-미안해요!"), {});
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent("미안해요!");
    expect(screen.getByTestId("messenger-choice-미안해요!")).toHaveAttribute(
      "accessibility-label",
      "미안해요!, selected",
    );
    expect(screen.getByTestId("messenger-choice-미안해요!")).toHaveAttribute(
      "data-selected",
      "true",
    );
    // 다시 고르면 바뀝니다.
    fireEvent.tap(screen.getByTestId("messenger-choice-괜찮아요?"), {});
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent("괜찮아요?");
    fireEvent.tap(screen.getByTestId("messenger-send"), {});
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
    expect(screen.queryByTestId("messenger-choices")).toBeNull();

    fireEvent.tap(screen.getByTestId("messenger-try-again").querySelector("view")!, {});
    fireEvent.tap(screen.getByTestId("messenger-choice-고마워요!"), {});
    fireEvent.tap(screen.getByTestId("messenger-send"), {});
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  });

  it("완료 재진입은 전체 기록과 결과 보기를 내고, 결과는 빈 목록이다", () => {
    const onFinish = vi.fn();
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="completed"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onFinish={onFinish}
      />,
    );
    expect(screen.getByTestId("messenger-message-jimin-goodbye")).toBeInTheDocument();
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    fireEvent.tap(screen.getByTestId("messenger-finish"), {});
    expect(onFinish).toHaveBeenCalledWith("appointment-confirmation", []);
  });
});
