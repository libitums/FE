package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Collections;
import org.junit.Test;

/** N-A5(ADR-0080): 우리 scheme만 딥링크로 받고 로그인 콜백 · 다른 scheme은 받지 않는다. 시작 전에는 꺼낼 것이 없다.
 * 리스너는 건 Activity의 것일 때만 풀린다(누수 방지). */
public final class AirbridgeDeeplinkTest {
  @Test public void n_a5_ownDeeplinkIsDuruSchemeExceptAuthCallback() {
    assertTrue(AirbridgeEvents.isOwnDeeplink("duru://roleplay"));
    assertTrue(AirbridgeEvents.isOwnDeeplink("DURU://settings?x=1"));
    assertFalse(AirbridgeEvents.isOwnDeeplink("duru://auth-callback?code=1"));
    assertFalse(AirbridgeEvents.isOwnDeeplink("https://duru.airbridge.io/a"));
    assertFalse(AirbridgeEvents.isOwnDeeplink(null));
  }

  /** N-A6(ADR-0080 D4 보충): 대시보드에 등록한 커스텀 도메인을 SDK에도 같은 FQDN으로 넣는다. */
  @Test public void n_a6_trackingLinkCustomDomainIsTheDashboardDomain() {
    assertEquals(
        Collections.singletonList("go.k-duru.com"), AirbridgeEvents.TRACKING_LINK_CUSTOM_DOMAINS);
  }

  @Test public void n_a5_clearingReleasesOnlyTheSameListener() {
    Runnable first = () -> {};
    Runnable second = () -> {};
    AirbridgeEvents.setDeeplinkListener(first);
    AirbridgeEvents.setDeeplinkListener(second);
    AirbridgeEvents.clearDeeplinkListener(first);
    assertTrue(AirbridgeEvents.hasDeeplinkListener());
    AirbridgeEvents.clearDeeplinkListener(second);
    assertFalse(AirbridgeEvents.hasDeeplinkListener());
  }

  @Test public void n_a5_nothingPendingBeforeAnyLink() {
    assertNull(AirbridgeEvents.takeDeeplink());
  }
}
