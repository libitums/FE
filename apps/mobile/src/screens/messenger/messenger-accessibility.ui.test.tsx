import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { MessengerScreen } from "./MessengerScreen";
import { MessengerFinishButton } from "./MessengerFinishButton";
import { messengerConversationFor } from "./messenger";

const conversation = messengerConversationFor("appointment-confirmation");

function renderActive() {
  render(
    <MessengerScreen
      conversation={conversation}
      completionStatus="available"
      onExit={vi.fn()}
      onComplete={vi.fn()}
      onFinish={vi.fn()}
    />,
  );
}

describe("messenger accessibility static regression guard", () => {
  it("자모 키는 접근성 요소·자모 이름·button trait를 갖는다", () => {
    renderActive();
    const key = screen.getByTestId("messenger-key-ㅂ");
    expect(key).toHaveAttribute("accessibility-element", "true");
    expect(key).toHaveAttribute("accessibility-label", "ㅂ");
    expect(key).toHaveAttribute("accessibility-traits", "button");
  });

  it("아이콘 키(윗글쇠 · 지우기)와 띄어쓰기는 낱말 이름을 갖는다", () => {
    renderActive();
    expect(screen.getByTestId("messenger-key-shift")).toHaveAttribute(
      "accessibility-label",
      "윗글쇠",
    );
    expect(screen.getByTestId("messenger-key-backspace")).toHaveAttribute(
      "accessibility-label",
      "지우기",
    );
    expect(screen.getByTestId("messenger-key-space")).toHaveAttribute(
      "accessibility-label",
      "띄어쓰기",
    );
  });

  it("보낼 말이 없는 보내기는 disabled trait다", () => {
    renderActive();
    const send = screen.getByTestId("messenger-send");
    expect(send).toHaveAttribute("accessibility-element", "true");
    expect(send).toHaveAttribute("accessibility-label", "보내기");
    expect(send).toHaveAttribute("accessibility-traits", "disabled");
  });

  it("결과 보기 버튼은 접근성 요소·정확한 이름·button trait를 갖는다", () => {
    render(<MessengerFinishButton onFinish={vi.fn()} />);
    const button = screen.getByTestId("messenger-finish");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "결과 보기");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });

  it("활성 메신저의 맵으로도 접근성 요소·정확한 이름·button trait를 갖는다", () => {
    renderActive();
    const button = screen.getByTestId("messenger-screen-exit");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "맵으로");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });

  it("완료 재진입의 결과 보기 역시 접근성 계약을 유지한다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="completed"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onFinish={vi.fn()}
      />,
    );
    const button = screen.getByTestId("messenger-finish");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "결과 보기");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });
});
