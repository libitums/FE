package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.Map;
import org.junit.Test;

/** `AppVersion`의 순수 변환을 잰다(HA1 · HA2). 실제 전송 시점 · 설정 화면의 문구는 e2e의 몫이다. */
public final class AppVersionTest {
  // HA1: 키 하나 `appVersion` 아래 platform · name · build 셋이고 build는 정수다.
  @Test public void ha1GlobalPropsCarryPlatformNameAndIntegerBuild() {
    assertEquals("appVersion", AppVersion.KEY);
    Map<String, Object> props = AppVersion.globalProps("0.1.0", 6L);
    assertEquals(1, props.size());
    @SuppressWarnings("unchecked")
    Map<String, Object> version = (Map<String, Object>) props.get("appVersion");
    assertEquals("android", version.get("platform"));
    assertEquals("0.1.0", version.get("name"));
    assertEquals(6, version.get("build"));
    assertTrue(AppVersion.globalProps("0.0.1", 0L).containsKey("appVersion"));
  }

  // HA2: 이름이 없거나 비었거나, 코드가 음수이거나 int 범위를 넘으면 아무것도 싣지 않는다.
  @Test public void ha2InvalidValuesSendNothing() {
    assertTrue(AppVersion.globalProps(null, 6L).isEmpty());
    assertTrue(AppVersion.globalProps("", 6L).isEmpty());
    assertTrue(AppVersion.globalProps("0.1.0", -1L).isEmpty());
    assertTrue(AppVersion.globalProps("0.1.0", Integer.MAX_VALUE + 1L).isEmpty());
  }
}
