package com.libitum.host;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;

/**
 * Play 구독 바꿈의 순수 판정(ADR-0144 「Android 결제 준비」). App Store는 구독 그룹 안에서 다른 구독을 사면 스토어가 바꿈으로 처리하지만,
 * Play에는 그룹이 없어 그냥 사면 구독이 둘이 된다. 그래서 호스트가 지금 Play 구독을 바꿀 대상(`oldProductId`)으로 넘기고, 시점은
 * iOS 그룹과 같게 고른다 — 수준표는 JS `screens/plans/plan-change.ts`(ADR-0160)와 같다: Premium이 위, Chat Plus · Unlimited Tickets는 같은 수준.
 * 위로 = 곧바로, 아래로 = 다음 갱신, 같은 수준은 기간이 같으면 곧바로 · 다르면 다음 갱신(App Store crossgrade 규칙).
 */
final class PurchasesPlanChange {
  enum Timing { IMMEDIATE, DEFERRED }

  /** 수준 높은 것 → 연간 먼저. 지금 구독이 여럿일 때 바꿀 대상을 고르는 순서다. */
  private static final List<String> SUBSCRIPTIONS = Arrays.asList(
      "duru.premium.yearly.v1", "duru.premium.monthly.v1",
      "duru.chatplus.yearly.v1", "duru.chatplus.monthly.v1",
      "duru.tickets.yearly.v1", "duru.tickets.monthly.v1");

  private PurchasesPlanChange() {}

  /** RevenueCat Play 상품 id(`구독id:기본요금제id`)의 앞부분. */
  static String baseId(String id) {
    if (id == null) return null;
    int colon = id.indexOf(':');
    return colon < 0 ? id : id.substring(0, colon);
  }

  static boolean isSubscription(String productId) {
    return productId != null && SUBSCRIPTIONS.contains(baseId(productId));
  }

  static Timing timingOf(String fromId, String toId) {
    int from = level(baseId(fromId));
    int to = level(baseId(toId));
    if (to != from) return to > from ? Timing.IMMEDIATE : Timing.DEFERRED;
    return yearly(fromId) == yearly(toId) ? Timing.IMMEDIATE : Timing.DEFERRED;
  }

  /** 바꿀 지금 Play 구독의 앞부분 id. 엽전 팩 · 대상 자신이 활성 · 우리 구독이 없으면 null. */
  static String replacedProductId(String targetId, Collection<String> activePlayIds) {
    if (!isSubscription(targetId) || activePlayIds == null) return null;
    String target = baseId(targetId);
    String replaced = null;
    for (String active : activePlayIds) {
      String id = baseId(active);
      if (target.equals(id)) return null;
      if (!isSubscription(id)) continue;
      if (replaced == null || SUBSCRIPTIONS.indexOf(id) < SUBSCRIPTIONS.indexOf(replaced)) replaced = id;
    }
    return replaced;
  }

  private static int level(String id) {
    return id != null && id.startsWith("duru.premium.") ? 2 : 1;
  }

  private static boolean yearly(String id) {
    return id != null && id.contains(".yearly.");
  }
}
