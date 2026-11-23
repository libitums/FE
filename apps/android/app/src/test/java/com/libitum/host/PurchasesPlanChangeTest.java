package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

/**
 * PPC-1 ~ PPC-6: Play 구독 바꿈 판정(ADR-0144 「Android 결제 준비」). Play에는 iOS 구독 그룹이 없어 다른 구독을 사면 둘이 겹친다 —
 * 호스트가 지금 Play 구독을 바꿀 대상으로 넘기고, 시점은 iOS 그룹과 같게(ADR-0160 수준표) 고른다.
 */
public final class PurchasesPlanChangeTest {
  private static final PurchasesPlanChange.Timing NOW = PurchasesPlanChange.Timing.IMMEDIATE;
  private static final PurchasesPlanChange.Timing LATER = PurchasesPlanChange.Timing.DEFERRED;

  // PPC-1: RevenueCat Play 상품 id의 기본 요금제 꼬리를 뗀다.
  @Test public void ppc1_baseIdDropsBasePlan() {
    assertEquals("duru.premium.monthly.v1", PurchasesPlanChange.baseId("duru.premium.monthly.v1:base"));
    assertEquals("duru.coins.500.v1", PurchasesPlanChange.baseId("duru.coins.500.v1"));
    assertNull(PurchasesPlanChange.baseId(null));
  }

  // PPC-2: 구독 여섯만 구독이다(꼬리 무시). 엽전 팩 · 모르는 id는 아니다.
  @Test public void ppc2_onlyTheSixSubscriptionsAreSubscriptions() {
    assertTrue(PurchasesPlanChange.isSubscription("duru.tickets.monthly.v1"));
    assertTrue(PurchasesPlanChange.isSubscription("duru.chatplus.yearly.v1:base"));
    assertTrue(PurchasesPlanChange.isSubscription("duru.premium.yearly.v1"));
    assertFalse(PurchasesPlanChange.isSubscription("duru.coins.1200.v1"));
    assertFalse(PurchasesPlanChange.isSubscription("duru.premium.monthly.v2"));
    assertFalse(PurchasesPlanChange.isSubscription(null));
  }

  // PPC-3: 위 수준으로 = 곧바로, 아래로 = 다음 갱신.
  @Test public void ppc3_upgradeIsImmediateDowngradeIsDeferred() {
    assertEquals(NOW, PurchasesPlanChange.timingOf("duru.tickets.monthly.v1", "duru.premium.monthly.v1"));
    assertEquals(NOW, PurchasesPlanChange.timingOf("duru.chatplus.yearly.v1:base", "duru.premium.monthly.v1"));
    assertEquals(LATER, PurchasesPlanChange.timingOf("duru.premium.monthly.v1", "duru.tickets.monthly.v1"));
    assertEquals(LATER, PurchasesPlanChange.timingOf("duru.premium.yearly.v1:base", "duru.chatplus.yearly.v1"));
  }

  // PPC-4: 같은 수준(Tickets ↔ Chat Plus · 같은 요금제 기간 바꿈) — 기간 같으면 곧바로, 다르면 다음 갱신(App Store crossgrade).
  @Test public void ppc4_crossgradeFollowsDuration() {
    assertEquals(NOW, PurchasesPlanChange.timingOf("duru.tickets.monthly.v1", "duru.chatplus.monthly.v1"));
    assertEquals(NOW, PurchasesPlanChange.timingOf("duru.chatplus.yearly.v1", "duru.tickets.yearly.v1"));
    assertEquals(LATER, PurchasesPlanChange.timingOf("duru.tickets.monthly.v1", "duru.chatplus.yearly.v1"));
    assertEquals(LATER, PurchasesPlanChange.timingOf("duru.premium.monthly.v1", "duru.premium.yearly.v1"));
    assertEquals(LATER, PurchasesPlanChange.timingOf("duru.premium.yearly.v1:base", "duru.premium.monthly.v1"));
  }

  // PPC-5: 바꿀 대상 = 활성 Play 구독 중 우리 구독(대상 자신 · 엽전 · 모르는 id 제외). 없으면 null.
  @Test public void ppc5_replacedProductIsTheOtherActivePlaySubscription() {
    assertEquals(
        "duru.tickets.monthly.v1",
        PurchasesPlanChange.replacedProductId(
            "duru.premium.monthly.v1", Arrays.asList("duru.tickets.monthly.v1:base", "duru.coins.500.v1")));
    assertNull(PurchasesPlanChange.replacedProductId("duru.premium.monthly.v1", Collections.emptyList()));
    assertNull(PurchasesPlanChange.replacedProductId("duru.premium.monthly.v1", null));
    assertNull(PurchasesPlanChange.replacedProductId(
        "duru.premium.monthly.v1", Arrays.asList("other.app.sub:base", "duru.coins.3000.v1")));
    // 엽전 팩을 사면 구독을 바꾸지 않는다.
    assertNull(PurchasesPlanChange.replacedProductId(
        "duru.coins.500.v1", Arrays.asList("duru.tickets.monthly.v1:base")));
  }

  // PPC-6: 대상 자신이 이미 활성이면 바꾸지 않는다(스토어가 「이미 가짐」으로 답함). 여럿이면 수준 높은 것 → 연간 먼저.
  @Test public void ppc6_sameProductActiveOrSeveralActive() {
    assertNull(PurchasesPlanChange.replacedProductId(
        "duru.premium.monthly.v1", Arrays.asList("duru.premium.monthly.v1:base", "duru.tickets.monthly.v1:base")));
    assertEquals(
        "duru.chatplus.yearly.v1",
        PurchasesPlanChange.replacedProductId(
            "duru.premium.yearly.v1",
            Arrays.asList("duru.tickets.monthly.v1:base", "duru.chatplus.monthly.v1:base", "duru.chatplus.yearly.v1:base")));
  }
}
