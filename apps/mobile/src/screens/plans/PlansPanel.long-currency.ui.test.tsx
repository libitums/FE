import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { RestoreResult, StoreOffer } from "../../lib/purchase-bridge";
import { PlansScreen } from "./PlansScreen";
import { plansTestIds as ids, type PlansScreenProps } from "./plans.contract";
import { catalogV1 } from "./plans.test-support";

// `ui` 계층(PL1 ~ PL3, ADR-0160 · 시안 P2): 긴 통화 — 스토어 가격 글을 그대로, 금액 한 줄 + 기간 아랫줄, 긴 금액은 한 단계 작게,
// CTA 두 줄(이름 / 가격), 연간 토글은 짧은 이름 + 할인 배지.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

const offers: readonly StoreOffer[] = [
  { productId: "duru.tickets.yearly.v1", price: "Rp 990.000" },
  { productId: "duru.chatplus.yearly.v1", price: "₱2,890" },
  { productId: "duru.premium.yearly.v1", price: "1.490.000 ₫" },
];

function mount(region: PlansScreenProps["region"] = "US") {
  render(
    <PlansScreen
      catalog={catalogV1}
      offers={offers}
      focus={null}
      region={region}
      onSelect={vi.fn(async () => ({ kind: "unavailable" as const }))}
      onRestore={vi.fn<() => Promise<RestoreResult>>(async () => ({ kind: "unavailable" }))}
      onBack={vi.fn()}
    />,
  );
}
const amount = (id: string) => screen.getByTestId(`plans-card-${id}-amount`);

test("PL1 금액은 스토어 글 그대로 한 줄, 기간은 아랫줄 — 10자 이상이면 compact", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.yearly), {});
  expect(amount("premium").textContent).toBe("1.490.000 ₫");
  expect(amount("premium").getAttribute("data-size")).toBe("compact");
  expect(amount("unlimited_tickets").textContent).toBe("Rp 990.000");
  expect(amount("unlimited_tickets").getAttribute("data-size")).toBe("compact");
  expect(amount("chat_plus").textContent).toBe("₱2,890");
  expect(amount("chat_plus").getAttribute("data-size")).toBe("regular");
  expect(screen.getByTestId(ids.price("premium"))).toHaveTextContent("/ yr");
});

test("PL2 CTA는 두 줄 — 이름 줄과 가격 줄이 따로 선다", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.yearly), {});
  expect(screen.getByTestId("plans-continue-title")).toHaveTextContent("Continue with Premium");
  expect(screen.getByTestId("plans-continue-detail").textContent).toBe("1.490.000 ₫ / year");
});

test("PL3 연간 토글은 짧은 이름 + 할인 배지(임시 가격으로 셀 수 있을 때)", () => {
  render(
    <PlansScreen
      catalog={catalogV1}
      offers={null}
      focus={null}
      onSelect={vi.fn(async () => ({ kind: "unavailable" as const }))}
      onRestore={vi.fn<() => Promise<RestoreResult>>(async () => ({ kind: "unavailable" }))}
      onBack={vi.fn()}
    />,
  );
  expect(screen.getByTestId(ids.yearly)).toHaveTextContent("Yearly");
  expect(screen.getByTestId("plans-period-saving").textContent).toMatch(/^-\d+%$/);
});
