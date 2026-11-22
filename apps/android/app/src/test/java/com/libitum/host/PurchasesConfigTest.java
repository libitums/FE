package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/** PCF-1 ~ PCF-3: Android 키는 Play 공개 SDK 키(`goog_`)만 SDK를 연다(ADR-0144 「Android 결제 준비」). */
public final class PurchasesConfigTest {
  // PCF-1: Play 공개 SDK 키는 trim한 한 덩어리로 선다.
  @Test public void pcf1_playPublicKeyStarts() {
    PurchasesConfig config = PurchasesConfig.from("  goog_AbCdEf123\n");
    assertNotNull(config);
    assertEquals("goog_AbCdEf123", config.apiKey());
  }

  // PCF-2: 빈 값 · 공백 섞임은 서지 않는다(기존 규칙).
  @Test public void pcf2_blankOrSpacedKeyIsNull() {
    assertNull(PurchasesConfig.from(null));
    assertNull(PurchasesConfig.from(""));
    assertNull(PurchasesConfig.from("goog_ab cd"));
  }

  // PCF-3: 다른 스토어 · 비밀 키는 서지 않는다 — iOS 키를 잘못 넣으면 구매가 모두 실패하고, 비밀 키는 앱에 들어가면 안 된다.
  @Test public void pcf3_otherPlatformOrSecretKeyIsNull() {
    assertNull(PurchasesConfig.from("appl_AbCdEf123"));
    assertNull(PurchasesConfig.from("amzn_AbCdEf123"));
    assertNull(PurchasesConfig.from("sk_AbCdEf123"));
    assertNull(PurchasesConfig.from("AbCdEf123"));
  }
}
