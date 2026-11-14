import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { planCardsFor } from "./plans-model";
import { ChatPlanOffer, TicketsPlanOffer } from "./PlanOffer";
import { plansTestIds as ids, type PlanOfferWiring } from "./plans.contract";
import { catalogV1 } from "./plans.test-support";

// `ui` 계층(SB-UI3): 맥락 카드 — 티켓(카드 하나 + Go unlimited + Compare plans) · 대화(카드 둘, 누르면 그 요금제).

afterEach(cleanup);

function offerFor(placement: "tickets" | "messenger") {
  return {
    cards: planCardsFor(catalogV1, placement, "monthly", null),
    onSelect: vi.fn<PlanOfferWiring["onSelect"]>(),
    onCompare: vi.fn<() => void>(),
    onShown: vi.fn<() => void>(),
  };
}

test("SB-UI3a 티켓 — 카드 하나, Go unlimited → onSelect(unlimited_tickets), Compare → onCompare, 보일 때 onShown 한 번", () => {
  const offer = offerFor("tickets");
  render(<TicketsPlanOffer offer={offer} />);
  expect(screen.getByTestId(ids.offer)).toHaveTextContent("Unlimited Tickets");
  expect(screen.queryByTestId(ids.offerCard("premium"))).toBeNull();
  fireEvent.tap(screen.getByTestId(ids.offerGo), {});
  expect(offer.onSelect).toHaveBeenCalledWith("unlimited_tickets");
  expect(screen.getByTestId(ids.offerGo)).toHaveTextContent("Go unlimited");
  fireEvent.tap(screen.getByTestId(ids.offerCompare), {});
  expect(offer.onCompare).toHaveBeenCalledTimes(1);
  expect(offer.onShown).toHaveBeenCalledTimes(1);
});

test("SB-UI3b 대화 — Chat Plus · Premium(BEST) 카드 둘, 누르면 그 요금제로", () => {
  const offer = offerFor("messenger");
  render(<ChatPlanOffer offer={offer} />);
  expect(screen.getByTestId(ids.offerCard("chat_plus"))).toHaveTextContent(
    "30 free messages a day",
  );
  expect(screen.getByTestId(ids.offerCard("premium"))).toHaveTextContent("BEST");
  fireEvent.tap(screen.getByTestId(ids.offerCard("premium")), {});
  expect(offer.onSelect).toHaveBeenCalledWith("premium");
  expect(screen.queryByTestId(ids.offerGo)).toBeNull();
  expect(offer.onShown).toHaveBeenCalledTimes(1);
});
