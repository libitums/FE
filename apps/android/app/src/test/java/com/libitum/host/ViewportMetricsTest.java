package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.util.Map;
import org.junit.Test;

/**
 * `ViewportMetrics`의 순수 변환을 잰다(HA1~HA3). 실제 전송 시점 · 실행 중 폭 변화 반영 · 글꼴 크기를
 * 바꿨을 때 Activity가 다시 서는 것은 e2e의 몫이다.
 */
public final class ViewportMetricsTest {
  // HA1: 키 둘, 폭은 px ÷ density(dp).
  @Test public void ha1GlobalPropsCarryFontScaleAndWidthInDp() {
    assertEquals("fontScale", ViewportMetrics.FONT_SCALE_KEY);
    assertEquals("viewportWidth", ViewportMetrics.VIEWPORT_WIDTH_KEY);

    Map<String, Object> props = ViewportMetrics.globalProps(1.3f, 1080, 2.625f);
    assertEquals(2, props.size());
    Object scale = props.get("fontScale");
    Object width = props.get("viewportWidth");
    assertTrue(scale instanceof Number);
    assertTrue(width instanceof Number);
    assertEquals(1.3d, ((Number) scale).doubleValue(), 1e-6);
    assertEquals(1080 / 2.625d, ((Number) width).doubleValue(), 1e-3);
  }

  // HA2: density <= 0 이거나 NaN 배율이면 그 키가 없고 던지지 않는다.
  @Test public void ha2InvalidInputsOmitTheirKeyWithoutThrowing() {
    Map<String, Object> zeroDensity = ViewportMetrics.globalProps(1.3f, 1080, 0f);
    assertFalse(zeroDensity.containsKey("viewportWidth"));
    assertTrue(zeroDensity.containsKey("fontScale"));

    Map<String, Object> negativeDensity = ViewportMetrics.globalProps(1.3f, 1080, -2f);
    assertFalse(negativeDensity.containsKey("viewportWidth"));
    assertTrue(negativeDensity.containsKey("fontScale"));

    Map<String, Object> nanScale = ViewportMetrics.globalProps(Float.NaN, 1080, 2.625f);
    assertFalse(nanScale.containsKey("fontScale"));
    assertTrue(nanScale.containsKey("viewportWidth"));

    Map<String, Object> zeroWidth = ViewportMetrics.globalProps(1.3f, 0, 2.625f);
    assertFalse(zeroWidth.containsKey("viewportWidth"));
    assertTrue(zeroWidth.containsKey("fontScale"));
  }

  // HA3: 같은 입력 두 번 -> equals가 참(「같으면 안 보낸다」의 전제).
  @Test public void ha3SameInputsProduceEqualMaps() {
    Map<String, Object> first = ViewportMetrics.globalProps(1.3f, 1080, 2.625f);
    Map<String, Object> second = ViewportMetrics.globalProps(1.3f, 1080, 2.625f);
    assertFalse(first.isEmpty());
    assertNotNull(second);
    assertEquals(first, second);
  }
}
