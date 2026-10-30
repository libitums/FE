import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { TopBar } from "./TopBar";

// `ui` 계층: 시험 계정(ADR-0085)의 티켓 칩은 숫자 대신 「∞」이고 이름이 「Unlimited tickets」이며 누를 수 없습니다.

test("TA6. ticketsUnlimited면 칩이 ∞를 보이고 눌러도 모달을 열지 않는다", () => {
  const onOpenTickets = vi.fn<() => void>();
  render(
    <TopBar
      streakDays={3}
      trophyCount={1}
      ticketCount={3}
      ticketsUnlimited
      onOpenTickets={onOpenTickets}
      onOpenNotifications={vi.fn<() => void>()}
    />,
  );

  const chip = screen.getByTestId("top-bar-tickets");
  expect(chip).toHaveAttribute("accessibility-label", "Unlimited tickets");
  expect(chip).toHaveTextContent("∞");
  expect(chip).not.toHaveAttribute("accessibility-traits", "button");
  fireEvent.tap(chip);
  expect(onOpenTickets).not.toHaveBeenCalled();
});

test("TA6. 꺼져 있으면 지금처럼 숫자와 「N tickets left」다", () => {
  render(
    <TopBar
      streakDays={3}
      trophyCount={1}
      ticketCount={2}
      onOpenTickets={vi.fn<() => void>()}
      onOpenNotifications={vi.fn<() => void>()}
    />,
  );

  const chip = screen.getByTestId("top-bar-tickets");
  expect(chip).toHaveAttribute("accessibility-label", "2 tickets left");
  expect(chip).toHaveTextContent("2");
});
