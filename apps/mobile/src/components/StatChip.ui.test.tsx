import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { StatChip } from "./StatChip";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).

test("[SC1] onTap이 없으면 읽기 전용 — 이름은 달고 버튼 특성은 없다", () => {
  render(<StatChip tone="diamond" value={4} accessibilityLabel="다이아 4개" testId="chip" />);

  const chip = screen.getByTestId("chip");
  expect(chip).toHaveTextContent("4");
  expect(chip).toHaveAttribute("accessibility-label", "다이아 4개");
  expect(chip).not.toHaveAttribute("accessibility-traits");
});

test("[SC2] onTap이 있으면 버튼이고 tap마다 한 번 부른다", () => {
  const onTap = vi.fn();
  render(
    <StatChip
      tone="streak"
      value={3}
      accessibilityLabel="연속 학습 3일"
      testId="chip"
      onTap={onTap}
    />,
  );

  const chip = screen.getByTestId("chip");
  expect(chip).toHaveAttribute("accessibility-traits", "button");
  fireEvent.tap(chip, {});
  expect(onTap).toHaveBeenCalledTimes(1);
});
