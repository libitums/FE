package com.libitum.host;

import static org.junit.Assert.assertEquals;

import java.util.Map;
import org.junit.Test;

public final class SafeAreaInsetsTest {
  @Test public void convertsPixelsToLayoutUnits() {
    Map<?, ?> insets = insetsOf(SafeAreaInsets.globalProps(126, 63, 0, 21, 0, 2.625f));
    assertEquals(48.0, (Double) insets.get("top"), 0.001);
    assertEquals(24.0, (Double) insets.get("bottom"), 0.001);
    assertEquals(0.0, (Double) insets.get("left"), 0.001);
    assertEquals(8.0, (Double) insets.get("right"), 0.001);
  }

  @Test public void treatsNegativeEdgesAndUnknownDensityAsZero() {
    Map<?, ?> negative = insetsOf(SafeAreaInsets.globalProps(-4, 63, 0, 0, 0, 3f));
    assertEquals(0.0, (Double) negative.get("top"), 0.001);
    assertEquals(21.0, (Double) negative.get("bottom"), 0.001);
    Map<?, ?> noDensity = insetsOf(SafeAreaInsets.globalProps(126, 63, 0, 0, 0, 0f));
    assertEquals(0.0, (Double) noDensity.get("top"), 0.001);
    assertEquals(0.0, (Double) noDensity.get("bottom"), 0.001);
  }

  @Test public void threeButtonNavigationReportsTappableBottom() {
    Map<String, Object> props = SafeAreaInsets.globalProps(126, 126, 0, 0, 126, 2.625f);
    assertEquals(48.0, (Double) props.get("tappableBottomInset"), 0.001);
    assertEquals(48.0, (Double) insetsOf(props).get("bottom"), 0.001);
  }

  @Test public void gestureNavigationReportsNoTappableBottom() {
    Map<String, Object> props = SafeAreaInsets.globalProps(126, 63, 0, 0, 0, 2.625f);
    assertEquals(0.0, (Double) props.get("tappableBottomInset"), 0.001);
    assertEquals(24.0, (Double) insetsOf(props).get("bottom"), 0.001);
  }

  @Test public void clampsTappableBottomToSafeBottom() {
    Map<String, Object> props = SafeAreaInsets.globalProps(126, 126, 0, 0, 900, 2.625f);
    assertEquals(48.0, (Double) props.get("tappableBottomInset"), 0.001);
  }

  @Test public void treatsNegativeTappableAndUnknownDensityAsZero() {
    Map<String, Object> negative = SafeAreaInsets.globalProps(126, 126, 0, 0, -4, 2.625f);
    assertEquals(0.0, (Double) negative.get("tappableBottomInset"), 0.001);
    Map<String, Object> noDensity = SafeAreaInsets.globalProps(126, 126, 0, 0, 126, 0f);
    assertEquals(0.0, (Double) noDensity.get("tappableBottomInset"), 0.001);
  }

  private static Map<?, ?> insetsOf(Map<String, Object> props) {
    return (Map<?, ?>) props.get("safeAreaInsets");
  }
}
