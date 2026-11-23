import { afterEach, expect, test, vi } from "vitest";

import { manageSubscriptionUrl, openManageSubscription } from "./manage-subscription";

// `unit` 계층(MS1 ~ MS3, ADR-0144 2단계 후속): 스토어 구독 관리 주소 · 여는 동작.

afterEach(() => {
  vi.unstubAllGlobals();
});

test("MS1 iOS는 App Store 계정의 구독 관리 주소 — 상품과 상관없다", () => {
  expect(manageSubscriptionUrl("ios", "duru.premium.monthly.v1")).toBe(
    "https://apps.apple.com/account/subscriptions",
  );
  expect(manageSubscriptionUrl("ios", null)).toBe("https://apps.apple.com/account/subscriptions");
});

test("MS2 Android는 Play 구독 관리 — 상품이 있으면 그 구독(`:` 뒤 기본 요금제는 뗌) · 패키지", () => {
  expect(manageSubscriptionUrl("android", "duru.premium.monthly.v1:base")).toBe(
    "https://play.google.com/store/account/subscriptions?sku=duru.premium.monthly.v1&package=libitum.duru.android",
  );
  expect(manageSubscriptionUrl("android", null)).toBe(
    "https://play.google.com/store/account/subscriptions",
  );
  expect(manageSubscriptionUrl(null, "duru.premium.monthly.v1")).toBeNull();
});

test("MS3 openManageSubscription — 외부 링크 모듈로 그 주소를 열고, 플랫폼을 모르거나 모듈이 없으면 false", () => {
  const open = vi.fn<(url: string, callback: (result: unknown) => void) => void>();
  vi.stubGlobal("NativeModules", { ExternalLinkModule: { open } });
  expect(openManageSubscription("ios", null)).toBe(true);
  expect(open).toHaveBeenCalledWith(
    "https://apps.apple.com/account/subscriptions",
    expect.any(Function),
  );
  expect(openManageSubscription(null, null)).toBe(false);
  vi.stubGlobal("NativeModules", {});
  expect(openManageSubscription("android", null)).toBe(false);
});
