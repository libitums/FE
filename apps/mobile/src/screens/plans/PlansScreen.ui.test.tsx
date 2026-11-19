import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PlanId } from "../../lib/plans-api";
import type { RestoreResult } from "../../lib/purchase-bridge";
import { PlansScreen } from "./PlansScreen";
import { plansTestIds as ids, type PlansScreenProps } from "./plans.contract";
import { catalogV1, usdOffers } from "./plans.test-support";

// `ui` 계층(SB-UI2): 설정 → Plans — 카드 셋 · 처음 고름 · 기간 · 계속(꺼진 다리 → 안내) · 복원 · 뒤로 · 실패.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function mount(
  over: { focus?: PlanId | null; catalog?: typeof catalogV1 | null; priced?: boolean } = {},
) {
  const handlers = {
    onSelect: vi.fn<PlansScreenProps["onSelect"]>(async () => ({ kind: "unavailable" })),
    onRestore: vi.fn<() => Promise<RestoreResult>>(async () => ({ kind: "unavailable" })),
    onBack: vi.fn<() => void>(),
  };
  render(
    <PlansScreen
      catalog={over.catalog === undefined ? catalogV1 : over.catalog}
      offers={over.priced === true ? usdOffers : null}
      focus={over.focus ?? null}
      {...handlers}
    />,
  );
  return handlers;
}
const tap = (testId: string) => fireEvent.tap(screen.getByTestId(testId), {});
const selected = (id: PlanId) => screen.getByTestId(ids.card(id)).getAttribute("data-selected");

test("SB-UI2a 제목 · 카드 셋(순서) · 처음 고름은 BEST · 주 단추는 그 이름 · 연간 안내", () => {
  mount({ priced: true });
  expect(screen.getByTestId(ids.screen)).toHaveTextContent("Plans");
  const order = Array.from(
    screen.getByTestId(ids.screen).querySelectorAll('[data-testid^="plans-card-"][data-best]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(order).toEqual([
    "plans-card-unlimited_tickets",
    "plans-card-chat_plus",
    "plans-card-premium",
  ]);
  expect(selected("premium")).toBe("true");
  expect(selected("chat_plus")).toBe("false");
  expect(screen.getByTestId(ids.continue)).toHaveTextContent("Continue with Premium");
  expect(screen.getByTestId(ids.continue)).toHaveTextContent("$11.99 / month");
  expect(screen.getByTestId(ids.yearly)).toHaveTextContent("Yearly");
  expect(screen.getByTestId(ids.price("premium"))).toHaveTextContent("$11.99");
  expect(screen.getByTestId(ids.price("premium"))).toHaveTextContent("/ mo");
});

test("SB-UI2b focus면 그 요금제를 처음 고르고, 카드를 누르면 고름이 옮겨 간다", () => {
  mount({ focus: "unlimited_tickets" });
  expect(selected("unlimited_tickets")).toBe("true");
  tap(ids.card("chat_plus"));
  expect(selected("chat_plus")).toBe("true");
  expect(selected("unlimited_tickets")).toBe("false");
  expect(screen.getByTestId(ids.continue)).toHaveTextContent("Continue with Chat Plus");
});

test("SB-UI2c Yearly → 가격이 연간으로, Continue → onSelect(premium, yearly, 상품) → 안내", async () => {
  const { onSelect } = mount({ priced: true });
  tap(ids.yearly);
  expect(screen.getByTestId(ids.price("premium"))).toHaveTextContent("$119.90");
  expect(screen.getByTestId(ids.price("premium"))).toHaveTextContent("/ yr");
  await act(async () => {
    tap(ids.continue);
  });
  expect(onSelect).toHaveBeenCalledWith("premium", "yearly", "duru.premium.yearly.v1");
  expect(screen.getByTestId(ids.notice)).toHaveTextContent("Payments are coming soon");
});

test("SB-UI2d Restore → onRestore → 안내", async () => {
  const { onRestore } = mount();
  expect(screen.queryByTestId(ids.notice)).toBeNull();
  await act(async () => {
    tap(ids.restore);
  });
  expect(onRestore).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(ids.notice)).toHaveTextContent("Payments are coming soon");
});

test("SB-UI2g 구매가 도는 동안 계속 단추는 로딩 · 복원은 막힘, 끝나면 풀린다(ADR-0160 두 줄 CTA)", async () => {
  let finish: (value: { kind: "cancelled" }) => void = () => {};
  const { onSelect } = mount({ priced: true });
  onSelect.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => {
    tap(ids.continue);
  });
  const flags = () => [
    screen.getByTestId(ids.continue).getAttribute("data-loading"),
    screen.getByTestId(ids.restore).getAttribute("data-disabled"),
  ];
  expect(flags()).toEqual(["true", "true"]);
  // 도는 동안 다시 눌러도 한 번뿐입니다.
  await act(async () => {
    tap(ids.continue);
    tap(ids.restore);
  });
  expect(onSelect).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ kind: "cancelled" });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(flags()).toEqual(["false", "false"]);
  expect(screen.queryByTestId(ids.notice)).toBeNull();
});

test("SB-UI2e 뒤로 단추 · 시스템 뒤로가기 모두 onBack", () => {
  const { onBack } = mount();
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onBack).toHaveBeenCalledTimes(1);
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(2);
});

test("SB-UI2f 요금제를 못 읽었으면 실패 안내만, 계속 · 복원 없음", () => {
  mount({ catalog: null });
  expect(screen.getByTestId(ids.empty)).toHaveTextContent("Couldn't load plans.");
  expect(screen.queryByTestId(ids.continue)).toBeNull();
  expect(screen.queryByTestId(ids.card("premium"))).toBeNull();
});
