package com.libitum.host;

import static org.junit.Assert.assertEquals;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * N-A4: 앱이 뜬 뒤 Airbridge SDK 시작 여부가 빌드의 값 유무와 일치한다.
 *
 * <p>값 없는 빌드(airbridge.properties 없음)에서 돌려 「꺼짐」인 것을 증거로 남긴다. 시작 전에는 SDK의
 * 정적 메서드를 부르지 않는다(초기화 전 동작 미확인) — 이 앱의 {@code started()}만 읽는다.
 */
@RunWith(AndroidJUnit4.class)
public final class AirbridgeEventsHostTest {
  @Test public void n_a4_startedMatchesTheBuildValues() {
    boolean hasConfig =
        AirbridgeEventsConfig.from(BuildConfig.AIRBRIDGE_APP_NAME, BuildConfig.AIRBRIDGE_SDK_TOKEN)
            != null;
    assertEquals(hasConfig, AirbridgeEvents.started());
  }
}
