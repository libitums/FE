import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { TopBar } from "./TopBar";

// `ui` 계층: 무제한(시험 계정 — ADR-0085, 표시는 ADR-0115)의 티켓 칩은 무제한 칩(무한 기호 그림)이고 이름이
// 「Unlimited tickets」이며, 누르면 무제한 모달을 엽니다(ADR-0085 D3 개정).

test("TA6. ticketsUnlimited면 무제한 칩이고 누르면 onOpenTickets를 부른다", () => {
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
  expect(screen.getByTestId("top-bar-tickets-infinity")).toBeInTheDocument();
  expect(chip).not.toHaveTextContent("∞");
  expect(chip).not.toHaveTextContent("3");
  expect(chip).toHaveAttribute("accessibility-traits", "button");
  fireEvent.tap(chip);
  expect(onOpenTickets).toHaveBeenCalledTimes(1);
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
  expect(screen.queryByTestId("top-bar-tickets-infinity")).not.toBeInTheDocument();
});
