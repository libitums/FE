package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** N-A5(ADR-0080): 우리 scheme만 딥링크로 받고 로그인 콜백 · 다른 scheme은 받지 않는다. 시작 전에는 꺼낼 것이 없다. */
public final class AirbridgeDeeplinkTest {
  @Test public void n_a5_ownDeeplinkIsDuruSchemeExceptAuthCallback() {
    assertTrue(AirbridgeEvents.isOwnDeeplink("duru://roleplay"));
    assertTrue(AirbridgeEvents.isOwnDeeplink("DURU://settings?x=1"));
    assertFalse(AirbridgeEvents.isOwnDeeplink("duru://auth-callback?code=1"));
    assertFalse(AirbridgeEvents.isOwnDeeplink("https://duru.airbridge.io/a"));
    assertFalse(AirbridgeEvents.isOwnDeeplink(null));
  }

  @Test public void n_a5_nothingPendingBeforeAnyLink() {
    assertNull(AirbridgeEvents.takeDeeplink());
  }
}
