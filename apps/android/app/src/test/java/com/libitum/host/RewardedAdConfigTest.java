package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** AdMob 값 판정(ADR-0209 D10) — 앱 ID만 앱에 있고, 샘플 앱 ID는 release에서 받지 않는다. 광고 단위 꼴은 서버 값 검사용. */
public final class RewardedAdConfigTest {
  private static final String SAMPLE = "ca-app-pub-3940256099942544~3347511713";
  private static final String REAL = "ca-app-pub-1234567890123456~1234567890";
  private static final String UNIT = "ca-app-pub-3940256099942544/5224354917";

  @Test public void acceptsRealAppIdEverywhereAndSampleOnlyOutsideRelease() {
    assertEquals(REAL, RewardedAdConfig.from(" " + REAL + " ", false).appId());
    assertEquals(SAMPLE, RewardedAdConfig.from(SAMPLE, true).appId());
    assertNull(RewardedAdConfig.from(SAMPLE, false));
  }

  @Test public void rejectsMissingOrMalformedAppId() {
    assertNull(RewardedAdConfig.from("", true));
    assertNull(RewardedAdConfig.from(null, true));
    assertNull(RewardedAdConfig.from(UNIT, true));
  }

  @Test public void unitIdShape() {
    assertTrue(RewardedAdConfig.isUnitId(UNIT));
    assertFalse(RewardedAdConfig.isUnitId(SAMPLE));
    assertFalse(RewardedAdConfig.isUnitId(" " + UNIT));
    assertFalse(RewardedAdConfig.isUnitId(null));
  }
}
