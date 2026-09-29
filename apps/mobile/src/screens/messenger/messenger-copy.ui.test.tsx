import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import { MessengerFinishButton } from "./MessengerFinishButton";
import { MessengerScreen } from "./MessengerScreen";
import { messengerConversationFor } from "./messenger";
import { messengerCorrectDelayMs } from "./messenger-composer";
import { sendMessengerReply } from "./messenger.test-support";

// `ui` 계층 — 메신저가 문구를 표에서 읽는지 봅니다(ST6-M). `markedUiCopy`를 넣으면 화면이 쓰는
// 키가 `⟦경로⟧`로 나옵니다 — 하드코딩된 영어가 있으면 그 자리에 영어가 남아 잡힙니다.

const conversation = messengerConversationFor("appointment-confirmation");

function renderMarked(exitTo: "journey" | "roleplay" = "journey") {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        exitTo={exitTo}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onFinish={vi.fn()}
      />
    </UiCopyContext.Provider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("[ST6-M] 메신저 문구는 표에서 읽는다", () => {
  it("자판 이름", () => {
    renderMarked();

    const label = (testId: string) =>
      screen.getByTestId(testId).getAttribute("accessibility-label");
    expect(label("messenger-key-shift")).toBe("⟦messenger.keyboard.shift⟧");
    expect(label("messenger-key-backspace")).toBe("⟦messenger.keyboard.backspace⟧");
    expect(label("messenger-key-,")).toBe("⟦messenger.keyboard.comma⟧");
    expect(label("messenger-key-.")).toBe("⟦messenger.keyboard.period⟧");
    expect(label("messenger-key-space")).toBe("⟦messenger.keyboard.space⟧");
    expect(label("messenger-key-?")).toBe("⟦messenger.keyboard.questionMark⟧");
    fireEvent.tap(screen.getByTestId("messenger-key-shift"), {});
    expect(label("messenger-key-shift")).toBe("⟦messenger.keyboard.shiftOn⟧");
  });

  it("보내기 이름 · 나가기 이름", () => {
    renderMarked();

    expect(screen.getByTestId("messenger-send")).toHaveAttribute(
      "accessibility-label",
      "⟦common.send⟧",
    );
    fireEvent.tap(screen.getByTestId("messenger-key-ㅈ"), {});
    expect(screen.getByTestId("messenger-send")).toHaveAttribute(
      "accessibility-label",
      "⟦common.sendWithText⟧(ㅈ)",
    );
    expect(screen.getByTestId("messenger-screen-exit")).toHaveAttribute(
      "accessibility-label",
      "⟦common.exitTo.journey⟧",
    );
  });

  it("roleplay 진입의 나가기 이름", () => {
    renderMarked("roleplay");

    expect(screen.getByTestId("messenger-screen-exit")).toHaveAttribute(
      "accessibility-label",
      "⟦common.exitTo.roleplay⟧",
    );
  });

  it("보기 · 자리표 · 내 화자", () => {
    renderMarked();
    sendMessengerReply("좋아요!");

    expect(screen.getByTestId("messenger-composer-text")).toHaveTextContent(
      "⟦messenger.placeholder⟧",
    );
    fireEvent.tap(screen.getByTestId("messenger-choice-미안해요!"), {});
    expect(screen.getByTestId("messenger-choice-미안해요!")).toHaveAttribute(
      "accessibility-label",
      "⟦common.selected⟧(미안해요!)",
    );
    expect(
      within(screen.getByTestId("messenger-message-self-accept")).getByTestId(
        "ui-lynx-chat-bubble",
      ),
    ).toHaveAttribute("accessibility-label", expect.stringContaining("⟦common.me⟧"));
  });

  it("결과 보기", () => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <MessengerFinishButton onFinish={vi.fn()} />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId("messenger-finish")).toHaveAttribute(
      "accessibility-label",
      "⟦common.seeResults⟧",
    );
    expect(screen.getByTestId("messenger-finish")).toHaveTextContent("⟦common.seeResults⟧");
  });

  it("대화가 끝난 화면의 결과 보기", () => {
    renderMarked();
    sendMessengerReply("좋아요!");
    sendMessengerReply("고마워요!");
    act(() => {
      vi.advanceTimersByTime(messengerCorrectDelayMs);
    });

    expect(screen.getByTestId("messenger-finish")).toHaveAttribute(
      "accessibility-label",
      "⟦common.seeResults⟧",
    );
  });
});
