// 테스트 지원 — 말하기 퀴즈의 조작 하나를 이름으로 누릅니다. 제품 코드는 import하지 않습니다.
//
// 마이크가 하는 일(Speak · Stop speaking · 판정 전 Try again)은 동그란 마이크 하나가 그 이름으로 맡고, 셸 버튼 행에는 판정 뒤
// (Continue · Try again · Next) · 결과만 섭니다(2026-11-27 사용자 결정, ADR-0201 D6 적용 1 개정). 같은 이름이 마이크와 셸 버튼에
// 동시에 서지 않는지도 함께 봅니다 — 「Stop」 이중 표시가 돌아오면 여기서 깨집니다.
import { expect } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

const MIC_BUTTON = "speak-word-mic-button";

export function tapSpeakWordControl(label: string): void {
  const action = screen.queryByTestId("learning-shell-action");
  const mic = screen.queryByTestId(MIC_BUTTON);
  const micLabel = mic?.getAttribute("accessibility-label") ?? null;
  if (action !== null && action.getAttribute("accessibility-label") === label) {
    expect(micLabel).not.toBe(label);
    fireEvent.tap(action, {});
    return;
  }
  expect(mic).not.toBeNull();
  expect(micLabel).toBe(label);
  expect(action?.getAttribute("accessibility-label") ?? null).not.toBe(label);
  fireEvent.tap(mic as Element, {});
}

/** 지금의 주 조작을 누릅니다 — 셸 버튼이 서 있으면(판정 뒤 · 불가 Skip) 그것, 아니면 마이크(말하기 · 멈춤 · 다시 말하기). */
export function tapSpeakWordPrimary(): void {
  const action = screen.queryByTestId("learning-shell-action");
  fireEvent.tap(action ?? screen.getByTestId(MIC_BUTTON), {});
}

/** 마이크가 맡는 이름인지 — 마이크의 낭독 이름이 그것이고 셸 버튼에는 그 이름이 없습니다. */
export function expectMicControl(label: string): void {
  expect(screen.getByTestId(MIC_BUTTON)).toHaveAttribute("accessibility-label", label);
  expect(
    screen.queryByTestId("learning-shell-action")?.getAttribute("accessibility-label") ?? null,
  ).not.toBe(label);
}
