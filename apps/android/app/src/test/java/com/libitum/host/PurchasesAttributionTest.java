package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * PA-1 ~ PA-3: RevenueCat 고객에 Airbridge 기기 id를 거는 판정(ADR-0144 「Airbridge 기기 id」). 실제 SDK 전송은 보지 않는다 —
 * 판정과 「시작되지 않은 빌드에서 아무것도 하지 않음」까지다.
 */
public final class PurchasesAttributionTest {
  // PA-1: 기기 id는 trim한 뒤 공백 없는 한 덩어리일 때만 쓴다.
  @Test public void pa1_validDeviceIdIsTrimmed() {
    assertEquals(
        "3f2a9c1e-5b7d-4e2a-9f1c-0a1b2c3d4e5f",
        PurchasesAttribution.deviceId("  3f2a9c1e-5b7d-4e2a-9f1c-0a1b2c3d4e5f\n"));
  }

  @Test public void pa1_missingBlankOrSpacedDeviceIdIsNull() {
    assertNull(PurchasesAttribution.deviceId(null));
    assertNull(PurchasesAttribution.deviceId(""));
    assertNull(PurchasesAttribution.deviceId("   "));
    assertNull(PurchasesAttribution.deviceId("3f2a 9c1e"));
  }

  // PA-2: 두 SDK가 모두 시작됐고 추적을 멈추지 않았을 때만 건다.
  @Test public void pa2_linksOnlyWhenBothStartedAndTrackingNotStopped() {
    assertTrue(PurchasesAttribution.shouldLink(true, true, false));
    assertFalse(PurchasesAttribution.shouldLink(false, true, false));
    assertFalse(PurchasesAttribution.shouldLink(true, false, false));
    assertFalse(PurchasesAttribution.shouldLink(true, true, true));
    assertFalse(PurchasesAttribution.shouldLink(false, false, false));
  }

  // PA-3: 값이 없는 빌드(두 SDK 모두 시작 안 됨)에서는 아무것도 하지 않고 던지지 않는다.
  @Test public void pa3_linkIsNoOpWhenSdksNotStarted() {
    assertFalse(PurchasesSdk.started());
    assertFalse(AirbridgeEvents.started());
    PurchasesAttribution.linkAirbridgeDevice(null);
    assertFalse(PurchasesSdk.started());
  }
}
