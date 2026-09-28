import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MessageBubble } from "./MessageBubble";
import { MessengerScreen } from "./MessengerScreen";
import { ReplayButton } from "./ReplayButton";
import { messengerConversationFor } from "./messenger";
import { messengerCorrectDelayMs } from "./messenger-composer";
import { sendMessengerReply, typeMessengerReply } from "./messenger.test-support";

// `ui` 계층: 실제 컴포넌트를 렌더하고 자판 · 판정 · 대화 전개를 봅니다(ADR-0006 D4).

const conversation = messengerConversationFor("appointment-confirmation");

function renderActive(onComplete = vi.fn()) {
  render(
    <MessengerScreen
      conversation={conversation}
      completionStatus="available"
      onExit={vi.fn()}
      onComplete={onComplete}
      onReplay={vi.fn()}
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
  it("MessageBubble은 지민 메시지의 문구 · 번역과 sender를 표시한다", () => {
    render(<MessageBubble message={conversation.messages[0]} />);
    const bubble = screen.getByTestId("messenger-message-jimin-schedule");
    expect(bubble).toHaveTextContent("토요일 오후 2시에 역 앞 카페에서 만나요.");
    expect(bubble).toHaveTextContent(conversation.messages[0].translation);
    expect(bubble).toHaveAttribute("data-sender", "jimin");
  });

  it("ReplayButton은 다시 보기 콜백을 호출한다", () => {
    const onReplay = vi.fn();
    render(<ReplayButton onReplay={onReplay} />);
    fireEvent.tap(screen.getByTestId("messenger-replay"), {});
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it("MessengerScreen은 제목·나가기·스크롤 표면을 낸다", () => {
    renderActive();
    expect(screen.getByTestId("messenger-screen-title")).toHaveTextContent("약속 확인 메시지");
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
        onReplay={vi.fn()}
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
      "보내기, 좋ㅇ",
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
    expect(screen.getByTestId("messenger-message-jimin-directions")).toBeInTheDocument();
    expect(screen.queryByTestId("answer-verdict")).toBeNull();
    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent("ㄱㅁㅇㅇ!");
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
    expect(screen.getByTestId("messenger-message-jimin-goodbye")).toHaveTextContent(
      "그럼 토요일에 봬요!",
    );
    expect(onComplete).toHaveBeenCalledWith("appointment-confirmation");
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    expect(screen.getByTestId("messenger-replay")).toBeInTheDocument();
  });

  it("판정 틈에 화면을 떠나면 답장이 서지 않는다", () => {
    const onComplete = vi.fn();
    const view = render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={vi.fn()}
        onComplete={onComplete}
        onReplay={vi.fn()}
      />,
    );
    typeMessengerReply("좋아요");
    view.unmount();
    act(() => {
      vi.advanceTimersByTime(messengerCorrectDelayMs);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("완료 재진입은 전체 기록과 다시 보기를 제공한다", () => {
    const onReplay = vi.fn();
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="completed"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={onReplay}
      />,
    );
    expect(screen.getByTestId("messenger-message-jimin-goodbye")).toBeInTheDocument();
    fireEvent.tap(screen.getByTestId("messenger-replay"), {});
    expect(onReplay).toHaveBeenCalledWith("appointment-confirmation");
    expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
  });
});
