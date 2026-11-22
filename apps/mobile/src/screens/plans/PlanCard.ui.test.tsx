import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { planCardsFor } from "./plans-model";
import { PlanCard } from "./PlanCard";
import { catalogV1, usdOffers } from "./plans.test-support";

// `ui` 계층(SB-UI1): 요금제 카드 — 이름 · BEST · 가격(없으면 스토어 안내) · 혜택 줄 · 한 요소 낭독 · 고름.

afterEach(cleanup);

const priced = planCardsFor(catalogV1, "settings", "monthly", usdOffers);
// 가격이 비면(스토어에도 임시 가격표에도 없는 상품) 「Price shown in the store」입니다. 스토어 목록에 없는 상품은 임시 가격으로
// 물러서므로(ADR-0144 2단계 2026-11-17) 가격 없는 카드는 직접 비웁니다.
const unpriced = planCardsFor(catalogV1, "settings", "yearly", []).map((card) => ({
  ...card,
  price: null,
  shown: null,
}));

test("SB-UI1a Premium — 이름 · BEST VALUE · 제목 · 세부 · 금액과 기간 · 라디오, 고르면 data-selected와 낭독 Selected (ADR-0160)", () => {
  const onPress = vi.fn<() => void>();
  render(
    <PlanCard card={priced[2]!} period="monthly" testId="card" selected={true} onPress={onPress} />,
  );
  const card = screen.getByTestId("card");
  expect(card).toHaveTextContent("Premium");
  expect(card).toHaveTextContent("BEST VALUE");
  expect(card).toHaveTextContent("Everything unlimited");
  expect(card).toHaveTextContent("+800 Yeopjeon every month");
  expect(screen.getByTestId("card-amount").textContent).toBe("$11.99");
  expect(screen.getByTestId("card-price")).toHaveTextContent("/ mo");
  expect(screen.getByTestId("card-radio").getAttribute("data-on")).toBe("true");
  expect(card.getAttribute("data-selected")).toBe("true");
  expect(card.getAttribute("data-best")).toBe("true");
  expect(card.getAttribute("accessibility-element")).toBe("true");
  expect(card.getAttribute("accessibility-traits")).toBe("button");
  expect(card.getAttribute("flatten")).toBe("false");
  expect(card.getAttribute("accessibility-label")).toBe(
    "Premium, BEST VALUE, $11.99 / month, Unlimited lessons, no waiting, Unlimited chat (fair use 200 a day), +800 Yeopjeon every month, Selected",
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
  expect(card).toHaveTextContent("30 chats a day");
  expect(card).toHaveTextContent("All friends · +300 Yeopjeon/mo");
  expect(card.getAttribute("data-selected")).toBe("false");
  expect(screen.getByTestId("card-radio").getAttribute("data-on")).toBe("false");
  expect(card.getAttribute("accessibility-label")).toContain("Chat with every character");
  expect(card.getAttribute("accessibility-label")).not.toContain("Selected");
});

test("SB-UI1c 연간 가격은 / yr, 맥락 카드(고름 없음)는 라디오가 없다", () => {
  const yearly = planCardsFor(catalogV1, "tickets", "yearly", usdOffers);
  render(<PlanCard card={yearly[0]!} period="yearly" testId="card" onPress={() => {}} />);
  expect(screen.getByTestId("card-amount").textContent).toBe("$39.90");
  expect(screen.getByTestId("card-price")).toHaveTextContent("/ yr");
  expect(screen.getByTestId("card").getAttribute("data-selected")).toBeNull();
  expect(screen.queryByTestId("card-radio")).toBeNull();
  expect(screen.getByTestId("card")).toHaveTextContent("Every unit, no ticket limit");
});

test("SB-UI1d 지금 카드는 회색 · 라디오 없음 · 탭 없음 · 지금 글(ADR-0160)", () => {
  const onPress = vi.fn<() => void>();
  render(
    <PlanCard
      card={priced[1]!}
      period="monthly"
      testId="card"
      selected={false}
      current="Current plan · renews Dec 18"
      onPress={onPress}
    />,
  );
  const card = screen.getByTestId("card");
  expect(card.getAttribute("data-current")).toBe("true");
  expect(card.getAttribute("data-selected")).toBe("false");
  expect(screen.queryByTestId("card-radio")).toBeNull();
  expect(screen.getByTestId("card-current")).toHaveTextContent("Current plan · renews Dec 18");
  expect(card.getAttribute("accessibility-traits")).toBe("none");
  fireEvent.tap(card, {});
  expect(onPress).not.toHaveBeenCalled();
});
