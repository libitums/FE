import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { planCardsFor } from "./plans-model";
import { PlanCard } from "./PlanCard";
import { catalogV1, usdOffers } from "./plans.test-support";

// `ui` 계층(SB-UI1): 요금제 카드 — 이름 · BEST · 가격(없으면 스토어 안내) · 혜택 줄 · 한 요소 낭독 · 고름.

afterEach(cleanup);

const priced = planCardsFor(catalogV1, "settings", "monthly", usdOffers);
const unpriced = planCardsFor(catalogV1, "settings", "yearly", null);

test("SB-UI1a Premium — 이름 · BEST · 월 가격 · 혜택 셋, 고르면 data-selected와 낭독 Selected", () => {
  const onPress = vi.fn<() => void>();
  render(
    <PlanCard card={priced[2]!} period="monthly" testId="card" selected={true} onPress={onPress} />,
  );
  const card = screen.getByTestId("card");
  expect(card).toHaveTextContent("Premium");
  expect(card).toHaveTextContent("BEST");
  expect(screen.getByTestId("card-price")).toHaveTextContent("$11.99 / month");
  expect(card).toHaveTextContent("Unlimited lessons, no waiting");
  expect(card).toHaveTextContent("Unlimited chat (fair use 200 a day)");
  expect(card).toHaveTextContent("+800 Yeopjeon every month");
  expect(card.getAttribute("data-selected")).toBe("true");
  expect(card.getAttribute("data-best")).toBe("true");
  expect(card.getAttribute("accessibility-element")).toBe("true");
  expect(card.getAttribute("accessibility-traits")).toBe("button");
  expect(card.getAttribute("flatten")).toBe("false");
  expect(card.getAttribute("accessibility-label")).toBe(
    "Premium, BEST, $11.99 / month, Unlimited lessons, no waiting, Unlimited chat (fair use 200 a day), +800 Yeopjeon every month, Selected",
  );
  fireEvent.tap(card, {});
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("SB-UI1b Chat Plus 연간 · 가격 없음 — BEST 없음, 스토어 안내, 고르지 않음", () => {
  render(
    <PlanCard
      card={unpriced[1]!}
      period="yearly"
      testId="card"
      selected={false}
      onPress={() => {}}
    />,
  );
  const card = screen.getByTestId("card");
  expect(card).not.toHaveTextContent("BEST");
  expect(screen.getByTestId("card-price")).toHaveTextContent("Price shown in the store");
  expect(card).toHaveTextContent("30 free messages a day");
  expect(card).toHaveTextContent("+300 Yeopjeon every month");
  expect(card).toHaveTextContent("Chat with every character");
  expect(card.getAttribute("data-selected")).toBe("false");
  expect(card.getAttribute("accessibility-label")).not.toContain("Selected");
});

test("SB-UI1c 연간 가격은 / year", () => {
  const yearly = planCardsFor(catalogV1, "tickets", "yearly", usdOffers);
  render(<PlanCard card={yearly[0]!} period="yearly" testId="card" onPress={() => {}} />);
  expect(screen.getByTestId("card-price")).toHaveTextContent("$39.90 / year");
  expect(screen.getByTestId("card").getAttribute("data-selected")).toBeNull();
});
