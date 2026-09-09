import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MessageBubble } from "./MessageBubble";
import { MessengerScreen } from "./MessengerScreen";
import { ReplayButton } from "./ReplayButton";
import { ReplyButton } from "./ReplyButton";
import type { MessengerConversation } from "./messenger.contract";

const conversation = {
  id: "appointment-confirmation",
  title: "약속 확인 메시지",
  participantName: "지민",
  messages: [
    { id: "jimin-schedule", sender: "jimin", text: "토요일 오후 2시에 역 앞 카페에서 만나요." },
    { id: "self-accept", sender: "self", text: "네, 좋아요. 토요일에 봬요!" },
    { id: "jimin-directions", sender: "jimin", text: "카페는 2번 출구 오른쪽에 있어요." },
    { id: "self-thanks", sender: "self", text: "네, 고마워요!" },
    { id: "jimin-goodbye", sender: "jimin", text: "그럼 토요일에 봬요!" },
  ],
} as MessengerConversation;

describe("messenger UI components", () => {
  it("MessageBubble은 지민 메시지의 실제 문구와 sender를 표시한다", () => {
    render(<MessageBubble message={conversation.messages[0]} />);
    expect(screen.getByTestId("messenger-message-jimin-schedule")).toHaveTextContent(
      "토요일 오후 2시에 역 앞 카페에서 만나요.",
    );
    expect(screen.getByTestId("messenger-message-jimin-schedule")).toHaveAttribute(
      "data-sender",
      "jimin",
    );
  });

  it("ReplyButton은 답장 이름을 표시하고 탭 콜백을 한 번 호출한다", () => {
    const onReply = vi.fn();
    render(<ReplyButton reply={conversation.messages[1]} onReply={onReply} />);
    const button = screen.getByTestId("messenger-reply-self-accept");
    expect(button).toHaveTextContent("네, 좋아요. 토요일에 봬요!");
    fireEvent.tap(button, {});
    expect(onReply).toHaveBeenCalledTimes(1);
  });

  it("ReplayButton은 다시 보기 콜백을 호출한다", () => {
    const onReplay = vi.fn();
    render(<ReplayButton onReplay={onReplay} />);
    fireEvent.tap(screen.getByTestId("messenger-replay"), {});
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it("MessengerScreen은 제목·나가기·스크롤 표면을 낸다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );
    expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
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

  it("초기 세션은 첫 메시지와 첫 답장만 표시한다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );
    expect(screen.getByTestId("messenger-message-jimin-schedule")).toHaveTextContent(
      "토요일 오후 2시에 역 앞 카페에서 만나요.",
    );
    expect(screen.getByTestId("messenger-reply-self-accept")).toBeInTheDocument();
    expect(screen.getByTestId("messenger-screen-progress")).toHaveTextContent("대화 1 / 2");
  });

  it("두 답장 뒤 마지막 수신 메시지와 완료 callback을 낸다", () => {
    const onComplete = vi.fn();
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={vi.fn()}
        onComplete={onComplete}
        onReplay={vi.fn()}
      />,
    );
    fireEvent.tap(screen.getByTestId("messenger-reply-self-accept"), {});
    fireEvent.tap(screen.getByTestId("messenger-reply-self-thanks"), {});
    expect(screen.getByTestId("messenger-message-jimin-goodbye")).toHaveTextContent(
      "그럼 토요일에 봬요!",
    );
    expect(screen.getByTestId("messenger-screen-progress")).toHaveTextContent("대화 완료");
    expect(onComplete).toHaveBeenCalledWith("appointment-confirmation");
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
  });
});
