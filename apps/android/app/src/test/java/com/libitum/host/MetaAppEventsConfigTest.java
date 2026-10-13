package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/** N-A1: `MetaAppEventsConfig.from`의 순수 판정. 앱 ID는 숫자뿐, 토큰은 공백 없는 한 덩어리일 때만 설정이 선다. */
public final class MetaAppEventsConfigTest {
  @Test public void n_a1_validValuesBuildAConfig() {
    MetaAppEventsConfig config = MetaAppEventsConfig.from("123", "abc");
    assertNotNull(config);
    assertEquals("123", config.appId());
    assertEquals("abc", config.clientToken());
  }

  @Test public void n_a1_surroundingWhitespaceIsTrimmed() {
    MetaAppEventsConfig config = MetaAppEventsConfig.from("  123\n", "\tabc  ");
    assertNotNull(config);
    assertEquals("123", config.appId());
    assertEquals("abc", config.clientToken());
  }

  @Test public void n_a1_missingOrBlankValuesYieldNull() {
    assertNull(MetaAppEventsConfig.from(null, null));
    assertNull(MetaAppEventsConfig.from("", ""));
    assertNull(MetaAppEventsConfig.from("   ", "   "));
    assertNull(MetaAppEventsConfig.from(null, "abc"));
    assertNull(MetaAppEventsConfig.from("123", null));
  }

  @Test public void n_a1_oneSideOnlyYieldsNull() {
    assertNull(MetaAppEventsConfig.from("123", ""));
    assertNull(MetaAppEventsConfig.from("", "abc"));
    assertNull(MetaAppEventsConfig.from("123", "   "));
    assertNull(MetaAppEventsConfig.from("   ", "abc"));
  }

  @Test public void n_a1_nonNumericAppIdYieldsNull() {
    assertNull(MetaAppEventsConfig.from("12a", "abc"));
    assertNull(MetaAppEventsConfig.from("abc", "abc"));
    assertNull(MetaAppEventsConfig.from("12 3", "abc"));
    assertNull(MetaAppEventsConfig.from("-123", "abc"));
  }

  @Test public void n_a1_tokenWithInnerWhitespaceYieldsNull() {
    assertNull(MetaAppEventsConfig.from("123", "ab c"));
    assertNull(MetaAppEventsConfig.from("123", "ab\tc"));
  }
}
