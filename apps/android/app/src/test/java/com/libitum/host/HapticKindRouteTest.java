package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

// KT-H2 · KT-H3 (ADR-0112): keyboard taps take their own path; the verdict table is unchanged.
public class HapticKindRouteTest {
  @Test
  public void verdictKindsTakeTheVerdictPath() {
    assertEquals(HapticKindRoute.VERDICT, HapticKindRoute.of("success"));
    assertEquals(HapticKindRoute.VERDICT, HapticKindRoute.of("error"));
  }

  @Test
  public void keyTakesTheKeyPath() {
    assertEquals(HapticKindRoute.KEY, HapticKindRoute.of("key"));
  }

  @Test
  public void unknownKindsAreIgnored() {
    assertEquals(HapticKindRoute.NONE, HapticKindRoute.of(null));
    assertEquals(HapticKindRoute.NONE, HapticKindRoute.of(""));
    assertEquals(HapticKindRoute.NONE, HapticKindRoute.of("KEY"));
    assertEquals(HapticKindRoute.NONE, HapticKindRoute.of("tick"));
  }

  @Test
  public void verdictPatternTableHasNoKeyEntry() {
    assertNull(HapticPattern.of("key"));
  }

  // Code review #403: below API 33 the vibrator does not reliably honour the system touch-feedback
  // setting, so the key tick reads it itself; from API 33 the touch usage is scaled by the system.
  @Test
  public void keyTickFollowsTheTouchFeedbackSettingBelowApi33() {
    assertEquals(false, HapticKindRoute.keyTickAllowed(26, 0));
    assertEquals(false, HapticKindRoute.keyTickAllowed(32, 0));
    assertEquals(true, HapticKindRoute.keyTickAllowed(26, 1));
    assertEquals(true, HapticKindRoute.keyTickAllowed(33, 0));
    assertEquals(true, HapticKindRoute.keyTickAllowed(36, 1));
  }
}
