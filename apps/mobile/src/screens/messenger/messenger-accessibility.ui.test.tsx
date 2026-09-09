import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

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

describe("messenger accessibility static regression guard", () => {
  it("첫 답장 버튼은 접근성 요소·정확한 이름·button trait를 갖는다", () => {
    render(<ReplyButton reply={conversation.messages[1]} onReply={vi.fn()} />);
    const button = screen.getByTestId("messenger-reply-self-accept");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "네, 좋아요. 토요일에 봬요!");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });

  it("두 번째 답장 버튼도 동일한 접근성 계약을 갖는다", () => {
    render(<ReplyButton reply={conversation.messages[3]} onReply={vi.fn()} />);
    const button = screen.getByTestId("messenger-reply-self-thanks");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "네, 고마워요!");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });

  it("처음부터 보기 버튼은 접근성 요소·정확한 이름·button trait를 갖는다", () => {
    render(<ReplayButton onReplay={vi.fn()} />);
    const button = screen.getByTestId("messenger-replay");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "처음부터 보기");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });

  it("활성 메신저의 맵으로도 접근성 요소·정확한 이름·button trait를 갖는다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );
    const button = screen.getByTestId("messenger-screen-exit");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "맵으로");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });

  it("완료 재진입의 다시 보기 역시 접근성 계약을 유지한다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="completed"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );
    const button = screen.getByTestId("messenger-replay");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "처음부터 보기");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });
});
