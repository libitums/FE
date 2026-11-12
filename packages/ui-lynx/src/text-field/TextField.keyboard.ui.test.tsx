import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { expect, test, vi } from "vitest";

import { TextField } from "./index";

// 시스템 키보드 높이(`keyboardheightchange`, iOS · Android)를 소비자에게 넘기는지 봅니다 — 아래에 붙은 시트가
// 키보드 위로 올라가는 데 씁니다(에피소드 설문 글 단계, 2026-11-12).

function keyboardHeight(height: number): void {
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView!.CustomEvent;
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:keyboardheightchange", { detail: { height } }),
  );
}

test("[TF-K1] 키보드 높이가 바뀌면 그 높이로, 내려가면 0으로 알린다", () => {
  const onHeight = vi.fn<(height: number) => void>();
  render(<TextField label="Message" bindkeyboardheightchange={onHeight} />);

  keyboardHeight(336);
  keyboardHeight(0);

  expect(onHeight.mock.calls).toEqual([[336], [0]]);
});

test("[TF-K2] 받는 쪽이 없어도 키보드 이벤트에 깨지지 않는다", () => {
  render(<TextField label="Message" />);
  expect(() => keyboardHeight(300)).not.toThrow();
});
