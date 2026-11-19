import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PlanEntitlements } from "../../lib/plans-api";
import type { RestoreResult } from "../../lib/purchase-bridge";
import { PlansScreen } from "./PlansScreen";
import { plansTestIds as ids, type PlansScreenProps } from "./plans.contract";
import { subscribedTo } from "./plans-subscribed.test-support";
import { catalogV1, usdOffers } from "./plans.test-support";

// `ui` 계층(PS1 ~ PS6, ADR-0160): 구독 중 Plans(시안 S3 · S4 · S5) — 지금 카드는 고를 수 없고, 처음 고름은 위 등급, CTA는 올림 ·
// 내림 · 기간 바꿈, Restore 옆 Manage subscription, 고지 앞에 바꿈 문장.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function mount(current: PlanEntitlements | null) {
  const handlers = {
    onSelect: vi.fn<PlansScreenProps["onSelect"]>(async () => ({ kind: "unavailable" })),
    onRestore: vi.fn<() => Promise<RestoreResult>>(async () => ({ kind: "unavailable" })),
    onBack: vi.fn<() => void>(),
    onManageSubscription: vi.fn<NonNullable<PlansScreenProps["onManageSubscription"]>>(),
  };
  render(
    <PlansScreen
      catalog={catalogV1}
      offers={usdOffers}
      focus={null}
      current={current}
      platform="ios"
      {...handlers}
    />,
  );
  return handlers;
}
const tap = (testId: string) => fireEvent.tap(screen.getByTestId(testId), {});
const card = (id: string) => screen.getByTestId(`plans-card-${id}`);
const cta = () => screen.getByTestId(ids.continue);

test("PS1 Chat Plus 구독(S3) — 지금 카드는 회색 · 라디오 없음 · 갱신 날짜, Premium을 고른 채 「Upgrade to Premium」", () => {
  mount(subscribedTo("chat_plus"));
  expect(card("chat_plus").getAttribute("data-current")).toBe("true");
  expect(card("chat_plus").getAttribute("data-selected")).toBe("false");
  expect(screen.getByTestId(ids.currentBadge("chat_plus"))).toHaveTextContent(
    "Current plan · renews Dec 18",
  );
  expect(card("premium").getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId(ids.tag("premium"))).toHaveTextContent("Upgrade · starts now");
  expect(cta()).toHaveTextContent("Upgrade to Premium");
  expect(cta()).toHaveTextContent("$11.99 / month");
  expect(screen.getByTestId(ids.yourPlan)).toHaveTextContent("Chat Plus");
  expect(screen.getByTestId(ids.terms)).toHaveTextContent(
    "Upgrading switches you from Chat Plus to Premium right away",
  );
});

test("PS2 지금 카드를 눌러도 고름이 옮겨 가지 않는다", () => {
  mount(subscribedTo("chat_plus"));
  tap(ids.card("chat_plus"));
  expect(card("premium").getAttribute("data-selected")).toBe("true");
  expect(card("chat_plus").getAttribute("data-current")).toBe("true");
});

test("PS3 Premium 구독(S4) — 처음엔 아무것도 고르지 않아 CTA가 막혀 있고, Chat Plus를 고르면 「Switch to Chat Plus · from Dec 18」", async () => {
  const { onSelect } = mount(subscribedTo("premium"));
  expect(cta().getAttribute("data-disabled")).toBe("true");
  // 접근성 점검 Major-1 · Critical-1: 막힌 단추는 disabled로 읽히고, Android에서 요소가 남습니다.
  expect(cta().getAttribute("accessibility-traits")).toBe("disabled");
  expect(cta().getAttribute("flatten")).toBe("false");
  expect(screen.getByTestId(ids.restore).getAttribute("flatten")).toBe("false");
  expect(cta()).toHaveTextContent("Choose a plan");
  await act(async () => {
    tap(ids.continue);
  });
  expect(onSelect).not.toHaveBeenCalled();
  tap(ids.card("chat_plus"));
  expect(cta().getAttribute("data-disabled")).toBe("false");
  expect(cta().getAttribute("accessibility-traits")).toBe("button");
  expect(cta()).toHaveTextContent("Switch to Chat Plus");
  expect(cta()).toHaveTextContent("from Dec 18");
  expect(screen.getByTestId(ids.tag("chat_plus"))).toHaveTextContent("Switch · starts Dec 18");
  expect(screen.getByTestId(ids.terms)).toHaveTextContent(
    "You keep Premium until Dec 18, then Chat Plus starts.",
  );
  await act(async () => {
    tap(ids.continue);
  });
  expect(onSelect).toHaveBeenCalledWith("chat_plus", "monthly", "duru.chatplus.monthly.v1");
});

test("PS4 같은 요금제 다른 기간은 고를 수 있고 CTA는 「Switch to yearly」", () => {
  mount(subscribedTo("chat_plus", "monthly"));
  tap(ids.yearly);
  expect(card("chat_plus").getAttribute("data-current")).toBe("false");
  tap(ids.card("chat_plus"));
  expect(card("chat_plus").getAttribute("data-selected")).toBe("true");
  expect(cta()).toHaveTextContent("Switch to yearly");
});

test("PS5 Unlimited Tickets 구독(S5) — Chat Plus는 「Switch」 태그, Manage subscription이 Restore 옆에서 지금 상품을 연다", async () => {
  const { onManageSubscription } = mount(subscribedTo("unlimited_tickets", "yearly", false));
  tap(ids.yearly);
  expect(screen.getByTestId(ids.currentBadge("unlimited_tickets"))).toHaveTextContent(
    "Current plan · ends Dec 18",
  );
  expect(screen.getByTestId(ids.tag("chat_plus"))).toHaveTextContent("Switch");
  expect(screen.getByTestId(ids.restore)).toBeTruthy();
  await act(async () => {
    tap(ids.manage);
  });
  expect(onManageSubscription).toHaveBeenCalledWith("duru.tickets.yearly.v1");
});

test("PS5b Premium 월 구독자가 Yearly로 바꿔 고른 것이 없어도 고지는 지금 요금제로 선다(리뷰 W2)", () => {
  mount(subscribedTo("premium", "monthly"));
  tap(ids.yearly);
  expect(screen.getByTestId(ids.terms)).toHaveTextContent("Premium: $11.99 / month.");
});

test("PS6 구독이 없으면 Manage subscription이 없고 칩은 Free", () => {
  mount(null);
  expect(screen.queryByTestId(ids.manage)).toBeNull();
  expect(screen.getByTestId(ids.yourPlan)).toHaveTextContent("Free");
  expect(cta()).toHaveTextContent("Continue with Premium");
});

test("PS7 미뤄진 내림(2026-11-19 Premium → Unlimited Tickets) — 지금 카드 한 줄이 바뀔 요금제와 날짜를 쓴다", () => {
  const premium = subscribedTo("premium");
  const [row] = premium.entitlements;
  mount({ ...premium, entitlements: [{ ...row!, pendingProductId: "duru.tickets.monthly.v1" }] });
  expect(screen.getByTestId(ids.currentBadge("premium"))).toHaveTextContent(
    "Current plan · Tickets ∞ from Dec 18",
  );
  expect(screen.getByTestId(ids.currentBadge("premium"))).not.toHaveTextContent("renews");
});

test("PS8 옛 서버(pendingProductId 없음)면 지금처럼 갱신 날짜", () => {
  mount(subscribedTo("premium"));
  expect(screen.getByTestId(ids.currentBadge("premium"))).toHaveTextContent(
    "Current plan · renews Dec 18",
  );
});
