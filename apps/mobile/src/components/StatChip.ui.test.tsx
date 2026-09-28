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

// 면은 자리마다 다릅니다 — 상단 바는 스크롤되는 내용 위에 떠 있어 흰 면을 칠하고, 학습
// 완료 머리는 바탕이 그대로 비칩니다.
test("[SC3] surface를 주지 않으면 면이 없고, white면 흰 면 클래스가 붙는다", () => {
  render(
    <>
      <StatChip tone="trophy" value={1} accessibilityLabel="트로피 1개" testId="plain" />
      <StatChip
        tone="trophy"
        value={1}
        accessibilityLabel="트로피 1개"
        testId="white"
        surface="white"
      />
    </>,
  );

  expect(screen.getByTestId("plain").getAttribute("class")).toBe("stat-chip");
  expect(screen.getByTestId("white").getAttribute("class")).toBe(
    "stat-chip stat-chip-surface-white",
  );
});
