import { render, screen } from "@lynx-js/react/testing-library";
import { expect, test } from "vitest";

import { BottomSheet } from "./BottomSheet";

// BS-IN1 · BS-IN2: 패널 아래 여백의 `env(safe-area-inset-bottom)`은 Lynx에서 0으로 풀린다(ADR-0044 D3). 아래 시스템 바 높이는
// 소비자가 `bottomInset`으로 넘기고, 시트가 패널 맨 아래(액션 뒤)에 그만큼 비운다.

test("BS-IN1: bottomInset만큼 패널 맨 아래에 빈 자리를 둔다(액션보다 뒤)", () => {
  render(
    <BottomSheet
      title="생년"
      closeAccessibilityLabel="닫기"
      actions={[{ id: "save", label: "저장" }]}
      bottomInset={48}
      ondismiss={() => undefined}
    />,
  );
  const inset = screen.getByTestId("ui-lynx-bottom-sheet-inset");
  expect(inset.getAttribute("style") ?? "").toMatch(/height:\s*48px/);
  // 패널 안, 액션 묶음 뒤(액션 안이 아님)에 섭니다.
  const panel = screen.getByTestId("ui-lynx-bottom-sheet-panel");
  const actions = screen.getByTestId("ui-lynx-bottom-sheet-actions");
  expect(panel.contains(inset)).toBe(true);
  expect(actions.contains(inset)).toBe(false);
  expect(actions.compareDocumentPosition(inset) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("BS-IN2: bottomInset이 없거나 0 · 유한한 양수가 아니면 빈 자리를 만들지 않는다", () => {
  for (const bottomInset of [undefined, 0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
    const { unmount } = render(
      <BottomSheet
        title="생년"
        closeAccessibilityLabel="닫기"
        bottomInset={bottomInset}
        ondismiss={() => undefined}
      />,
    );
    expect(screen.queryByTestId("ui-lynx-bottom-sheet-inset")).toBeNull();
    unmount();
  }
});
