import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { UnlimitedTicketChip } from "./UnlimitedTicketChip";

// `ui` 계층: 무제한 티켓 칩(ADR-0115 · 시안 O1) — 흰 티켓 아이콘 + 그린 무한 기호, 글자 없음, 빛 훑기는 움직임이 있을
// 때만, `onTap`이 있으면 버튼.

afterEach(cleanup);

test("UC1. 무한 기호 그림이 서고 글자 「∞」는 없다 — 이름은 받은 그대로", () => {
  render(<UnlimitedTicketChip testId="chip" accessibilityLabel="Unlimited tickets" height="hug" />);
  const chip = screen.getByTestId("chip");
  expect(chip).toHaveAttribute("accessibility-label", "Unlimited tickets");
  expect(screen.getByTestId("chip-infinity")).toBeInTheDocument();
  expect(chip).not.toHaveTextContent("∞");
  expect(chip.getAttribute("class")).toContain("unlimited-ticket-chip");
});

test("UC2. onTap이 있으면 버튼이고 탭이 부른다, 없으면 traits가 없다", () => {
  const onTap = vi.fn<() => void>();
  render(
    <UnlimitedTicketChip
      testId="chip"
      accessibilityLabel="Unlimited tickets"
      height="touch-target"
      onTap={onTap}
    />,
  );
  const chip = screen.getByTestId("chip");
  expect(chip).toHaveAttribute("accessibility-traits", "button");
  expect(chip.getAttribute("class")).toContain("stat-chip-height-touch-target");
  fireEvent.tap(chip);
  expect(onTap).toHaveBeenCalledTimes(1);
  cleanup();

  render(<UnlimitedTicketChip testId="chip" accessibilityLabel="Unlimited tickets" height="hug" />);
  expect(screen.getByTestId("chip")).not.toHaveAttribute("accessibility-traits", "button");
});

test("UC3. 움직임이 standard면 빛 훑기 띠가 선다", () => {
  render(<UnlimitedTicketChip testId="chip" accessibilityLabel="Unlimited tickets" height="hug" />);
  expect(screen.getByTestId("chip-shine")).toBeInTheDocument();
});

test("UC4. 움직임 줄이기에서는 빛 훑기 띠가 없다", () => {
  render(
    <MotionProvider motion="reduced">
      <UnlimitedTicketChip testId="chip" accessibilityLabel="Unlimited tickets" height="hug" />
    </MotionProvider>,
  );
  expect(screen.getByTestId("chip-infinity")).toBeInTheDocument();
  expect(screen.queryByTestId("chip-shine")).not.toBeInTheDocument();
});
