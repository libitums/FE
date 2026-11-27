package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/** AdMob 값 판정(ADR-0208) — 둘 다 모양이 맞을 때만 SDK를 시작한다. 값은 Google 공식 테스트 ID다. */
public final class RewardedAdConfigTest {
  private static final String APP = "ca-app-pub-3940256099942544~3347511713";
  private static final String UNIT = "ca-app-pub-3940256099942544/5224354917";

  @Test public void acceptsAppAndRewardedUnitIds() {
    RewardedAdConfig config = RewardedAdConfig.from(" " + APP + " ", UNIT);
    assertEquals(APP, config.appId());
    assertEquals(UNIT, config.unitId());
  }

  @Test public void rejectsMissingOrMalformedValues() {
    assertNull(RewardedAdConfig.from(APP, ""));
    assertNull(RewardedAdConfig.from(APP, null));
    assertNull(RewardedAdConfig.from("", UNIT));
    // 앱 ID와 광고 단위를 바꿔 넣은 경우.
    assertNull(RewardedAdConfig.from(UNIT, APP));
    assertNull(RewardedAdConfig.from(APP, "ca-app-pub-1/2 3"));
  }
}
