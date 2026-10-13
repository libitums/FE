package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/**
 * N-A1: `AirbridgeEventsConfig.from`의 순수 판정. 앱 이름은 영문 · 숫자 · 밑줄 · 하이픈만, 토큰은 공백 없는
 * 한 덩어리일 때만 설정이 선다(앞뒤 공백은 trim). 결정: docs/adr/0063-airbridge-events.md D4.
 */
public final class AirbridgeEventsConfigTest {
  @Test public void n_a1_validValuesBuildAConfig() {
    AirbridgeEventsConfig config = AirbridgeEventsConfig.from("duru", "0a1b2c");
    assertNotNull(config);
    assertEquals("duru", config.appName());
    assertEquals("0a1b2c", config.sdkToken());
  }

  @Test public void n_a1_surroundingWhitespaceIsTrimmed() {
    AirbridgeEventsConfig config = AirbridgeEventsConfig.from("  duru\n", "\t0a1b2c  ");
    assertNotNull(config);
    assertEquals("duru", config.appName());
    assertEquals("0a1b2c", config.sdkToken());
  }

  @Test public void n_a1_underscoreAndHyphenInTheNameAreAllowed() {
    AirbridgeEventsConfig config = AirbridgeEventsConfig.from("du_ru-1", "0a1b2c");
    assertNotNull(config);
    assertEquals("du_ru-1", config.appName());
  }

  @Test public void n_a1_missingOrBlankValuesYieldNull() {
    assertNull(AirbridgeEventsConfig.from(null, null));
    assertNull(AirbridgeEventsConfig.from("", ""));
    assertNull(AirbridgeEventsConfig.from("   ", "   "));
  }

  @Test public void n_a1_oneSideOnlyYieldsNull() {
    assertNull(AirbridgeEventsConfig.from(null, "0a1b2c"));
    assertNull(AirbridgeEventsConfig.from("duru", null));
    assertNull(AirbridgeEventsConfig.from("duru", ""));
    assertNull(AirbridgeEventsConfig.from("", "0a1b2c"));
    assertNull(AirbridgeEventsConfig.from("duru", "   "));
    assertNull(AirbridgeEventsConfig.from("   ", "0a1b2c"));
  }

  @Test public void n_a1_nameWithSpaceDotOrNonAsciiYieldsNull() {
    assertNull(AirbridgeEventsConfig.from("du ru", "0a1b2c"));
    assertNull(AirbridgeEventsConfig.from("du.ru", "0a1b2c"));
    assertNull(AirbridgeEventsConfig.from("두루", "0a1b2c"));
  }

  @Test public void n_a1_tokenWithInnerWhitespaceYieldsNull() {
    assertNull(AirbridgeEventsConfig.from("duru", "ab c"));
    assertNull(AirbridgeEventsConfig.from("duru", "ab\tc"));
  }
}
