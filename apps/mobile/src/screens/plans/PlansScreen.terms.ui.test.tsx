import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PlanEntitlements } from "../../lib/plans-api";
import type { RestoreResult } from "../../lib/purchase-bridge";
import { PlansScreen } from "./PlansScreen";
import { plansTestIds as ids, type PlansScreenProps } from "./plans.contract";
import { catalogV1, usdOffers } from "./plans.test-support";

// `ui` 계층(SB-UT1 ~ SB-UT4, ADR-0144 2단계 후속): 구독 구매 화면의 필수 고지(App Store 3.1.2 · Play 구독 정책) — 요금제 이름 ·
// 가격 · 기간 · 자동 갱신 · 해지 방법 · 이용약관 · 개인정보처리방침, 그리고 서버 권한의 「지금 요금제」 · 스토어 구독 관리.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

const premiumNow: PlanEntitlements = {
  tier: "premium",
  unlimitedTickets: true,
  entitlements: [
    {
      id: "premium",
      productId: "duru.premium.monthly.v1",
      status: "active",
      willRenew: true,
      expiresAt: "2026-12-18T00:00:00Z",
    },
  ],
};

function mount(
  over: Partial<Pick<PlansScreenProps, "current" | "platform">> & { priced?: boolean } = {},
) {
  const handlers = {
    onSelect: vi.fn<PlansScreenProps["onSelect"]>(async () => ({ kind: "unavailable" })),
    onRestore: vi.fn<() => Promise<RestoreResult>>(async () => ({ kind: "unavailable" })),
    onBack: vi.fn<() => void>(),
    onOpenLegal: vi.fn<NonNullable<PlansScreenProps["onOpenLegal"]>>(),
    onManageSubscription: vi.fn<NonNullable<PlansScreenProps["onManageSubscription"]>>(),
  };
  render(
    <PlansScreen
      catalog={catalogV1}
      offers={over.priced === false ? null : usdOffers}
      focus={null}
      current={over.current ?? null}
      platform={over.platform === undefined ? "ios" : over.platform}
      {...handlers}
    />,
  );
  return handlers;
}
const tap = (testId: string) => fireEvent.tap(screen.getByTestId(testId), {});
const terms = () => screen.getByTestId(ids.terms);

test("SB-UT1 고지 전문 — 고른 요금제 이름 · 가격/기간 · 자동 갱신 · 24시간 전 해지 · 스토어 이름", () => {
  mount({ platform: "ios" });
  expect(terms()).toHaveTextContent("Premium: $11.99 / month.");
  expect(terms()).toHaveTextContent("renews automatically");
  expect(terms()).toHaveTextContent("at least 24 hours before");
  expect(terms()).toHaveTextContent("App Store");
  tap(ids.yearly);
  expect(terms()).toHaveTextContent("Premium: $119.90 / year.");
  tap(ids.card("chat_plus"));
  expect(terms()).toHaveTextContent("Chat Plus: $69.90 / year.");
});

test("SB-UT2 Android는 Google Play, 플랫폼을 모르면 일반 이름(스토어 가격이 없으면 임시 추천 가격 그대로)", () => {
  mount({ platform: "android", priced: false });
  expect(terms()).toHaveTextContent("Google Play");
  cleanup();
  mount({ platform: null, priced: false });
  expect(terms()).toHaveTextContent("your app store");
  expect(terms()).toHaveTextContent("Premium: $11.99 / month.");
});

test("SB-UT3 이용약관 · 개인정보처리방침은 눌러 열 수 있는 링크다", () => {
  const { onOpenLegal } = mount();
  const termsLink = screen.getByTestId(ids.termsOfUse);
  expect(termsLink).toHaveAttribute("accessibility-traits", "link");
  expect(termsLink).toHaveTextContent("Terms of Use");
  tap(ids.termsOfUse);
  tap(ids.privacyPolicy);
  expect(onOpenLegal.mock.calls).toEqual([["terms-of-use"], ["privacy-policy"]]);
});

test("SB-UT5 바닥에는 계속 단추 · 한 줄 고지 · 링크만 남고, 고지 전문 · Restore는 카드 아래 스크롤에 선다(2026-11-19)", () => {
  mount();
  const line = screen.getByTestId(ids.termsLine);
  expect(line).toHaveTextContent("Renews automatically. Cancel anytime.");
  expect(line).toContainElement(screen.getByTestId(ids.termsOfUse));
  expect(line).toContainElement(screen.getByTestId(ids.privacyPolicy));
  expect(line.closest("scroll-view")).toBeNull();
  expect(terms().closest("scroll-view")).not.toBeNull();
  expect(screen.getByTestId(ids.restore).closest("scroll-view")).not.toBeNull();
});

test("SB-UT4 지금 요금제(서버 권한) — 그 카드에 「Current plan」, 처음엔 고름 없음(CTA 막힘), Manage subscription은 그 상품 (ADR-0160)", async () => {
  const { onManageSubscription, onSelect } = mount({ current: premiumNow });
  expect(screen.getByTestId(ids.currentBadge("premium"))).toHaveTextContent("Current plan");
  expect(screen.queryByTestId(ids.currentBadge("chat_plus"))).toBeNull();
  expect(screen.getByTestId(ids.continue).getAttribute("data-disabled")).toBe("true");
  await act(async () => {
    tap(ids.manage);
  });
  expect(onManageSubscription).toHaveBeenCalledWith("duru.premium.monthly.v1");
  expect(onSelect).not.toHaveBeenCalled();
  tap(ids.card("chat_plus"));
  expect(screen.getByTestId(ids.continue)).toHaveTextContent("Switch to Chat Plus");
  // 다른 요금제를 고른 동안에도 구독 관리는 Restore 옆에 남습니다.
  expect(screen.getByTestId(ids.manage)).toBeTruthy();
});
