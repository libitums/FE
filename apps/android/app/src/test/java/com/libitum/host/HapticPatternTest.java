package com.libitum.host;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class HapticPatternTest {
  @Test public void successIsOneShortPulse() {
    HapticPattern pattern = HapticPattern.of("success");
    assertNotNull(pattern);
    assertArrayEquals(new long[] {0, 40}, pattern.timings);
    assertArrayEquals(new int[] {0, 255}, pattern.amplitudes);
  }

  @Test public void errorIsTwoLongerPulses() {
    HapticPattern pattern = HapticPattern.of("error");
    assertNotNull(pattern);
    assertArrayEquals(new long[] {0, 70, 110, 70}, pattern.timings);
    assertArrayEquals(new int[] {0, 255, 0, 255}, pattern.amplitudes);
  }

  @Test public void unknownKindsHaveNoPattern() {
    assertNull(HapticPattern.of(null));
    assertNull(HapticPattern.of(""));
    assertNull(HapticPattern.of("SUCCESS"));
    assertNull(HapticPattern.of("confirm"));
  }

  @Test public void everyPatternIsAValidOneShotWaveform() {
    for (String kind : new String[] {"success", "error"}) {
      HapticPattern pattern = HapticPattern.of(kind);
      assertNotNull(pattern);
      // VibrationEffect.createWaveform: same length, amplitudes 0..255, never repeats.
      assertEquals(pattern.timings.length, pattern.amplitudes.length);
      long total = 0;
      for (int i = 0; i < pattern.timings.length; i += 1) {
        assertTrue(pattern.timings[i] >= 0);
        assertTrue(pattern.amplitudes[i] >= 0 && pattern.amplitudes[i] <= 255);
        total += pattern.timings[i];
      }
      // A verdict cue, not an alert: the whole pattern stays under 300 ms.
      assertTrue(total > 0 && total < 300);
    }
  }

  @Test public void errorDiffersFromSuccessByCountAndLengthNotOnlyAmplitude() {
    // Most budget motors have no amplitude control (Galaxy A52s: capabilities 0), so the two
    // verdicts must differ in pulse count and pulse length; each pulse is long enough (>= 40 ms)
    // for a slow motor to spin up, and the error gap (>= 100 ms) keeps its two pulses apart.
    HapticPattern success = HapticPattern.of("success");
    HapticPattern error = HapticPattern.of("error");
    assertNotNull(success);
    assertNotNull(error);
    assertEquals(1, pulses(success));
    assertEquals(2, pulses(error));
    assertTrue(error.timings[1] > success.timings[1]);
    assertTrue(success.timings[1] >= 40);
    assertTrue(error.timings[2] >= 100);
  }

  private static int pulses(HapticPattern pattern) {
    int count = 0;
    for (int i = 0; i < pattern.amplitudes.length; i += 1) if (pattern.amplitudes[i] > 0) count += 1;
    return count;
  }
}
