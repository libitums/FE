// 테스트가 메신저 답장을 가상 키보드로 치는 길입니다 — 제품 코드가 부르지 않습니다.
// 화면 · 통합 테스트가 같은 순서(키 → 보내기 → 판정 틈)를 되풀이하지 않게 모읍니다.

import { act, fireEvent, screen } from "@lynx-js/react/testing-library";
import { vi } from "vitest";

import { keystrokesFor } from "./hangul-keyboard";
import { messengerConversationFor } from "./messenger";
import { messengerCorrectDelayMs } from "./messenger-composer";

/**
 * 답장을 입력하고 보내기를 누릅니다. 객관식 답장이면 그 문장의 보기를 고르고, 아니면 자판으로
 * 칩니다 — 자판에 없는 문장 부호(`!` 등)는 건너뜁니다(채점이 문장 부호를 보지 않습니다).
 */
export function typeMessengerReply(text: string): void {
  if (screen.queryByTestId("messenger-choices") !== null) {
    fireEvent.tap(screen.getByTestId(`messenger-choice-${text}`), {});
    fireEvent.tap(screen.getByTestId("messenger-send"), {});
    return;
  }
  for (const key of keystrokesFor(text)) {
    const button = screen.queryByTestId(`messenger-key-${key}`);
    if (button !== null) fireEvent.tap(button, {});
  }
  fireEvent.tap(screen.getByTestId("messenger-send"), {});
}

/** 맞는 답장을 입력하고 판정 틈을 흘려 답장이 대화에 서게 합니다. 가짜 타이머가 필요합니다. */
export function sendMessengerReply(text: string): void {
  typeMessengerReply(text);
  act(() => {
    vi.advanceTimersByTime(messengerCorrectDelayMs);
  });
}

/**
 * 약속 확인 메시지의 답장을 앞에서부터 `count`개 맞게 칩니다(기본: 둘 다 — 대화 완료).
 * 가짜 타이머가 꺼져 있으면 이 안에서만 켰다 끕니다 — 통합 테스트는 스플래시 뒤 진짜
 * 타이머로 돌아가 있습니다.
 */
export function answerMessengerReplies(count: 1 | 2 = 2): void {
  const faking = vi.isFakeTimers();
  if (!faking) vi.useFakeTimers();
  for (const reply of appointmentReplies.slice(0, count)) sendMessengerReply(reply);
  if (!faking) vi.useRealTimers();
}

const appointmentReplies = messengerConversationFor("appointment-confirmation")
  .messages.filter((message) => message.sender === "self")
  .map((message) => message.text);
