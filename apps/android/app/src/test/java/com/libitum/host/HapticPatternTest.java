package com.libitum.host;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class HapticPatternTest {
  @Test public void successIsTwoQuickTaps() {
    HapticPattern pattern = HapticPattern.of("success");
    assertNotNull(pattern);
    assertArrayEquals(new long[] {0, 55, 70, 55}, pattern.timings);
    assertArrayEquals(new int[] {0, 255, 0, 255}, pattern.amplitudes);
  }

  @Test public void errorIsOneLongBuzz() {
    HapticPattern pattern = HapticPattern.of("error");
    assertNotNull(pattern);
    assertArrayEquals(new long[] {0, 280}, pattern.timings);
    assertArrayEquals(new int[] {0, 255}, pattern.amplitudes);
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
      assertTrue(total > 0 && total <= 300);
    }
  }

  @Test public void verdictsDifferByRhythmNotOnlyAmplitude() {
    // Most budget motors have no amplitude control (Galaxy A52s: capabilities 0), so meaning rides
    // on rhythm: a quick double tap reads as "done", one long buzz as "no" (user feedback: one
    // 40 ms pulse felt weak and not like a correct answer). Every pulse is >= 50 ms so a slow
    // motor spins up, and the long buzz is clearly longer than both taps together.
    HapticPattern success = HapticPattern.of("success");
    HapticPattern error = HapticPattern.of("error");
    assertNotNull(success);
    assertNotNull(error);
    assertEquals(2, pulses(success));
    assertEquals(1, pulses(error));
    for (int i = 1; i < success.timings.length; i += 2) assertTrue(success.timings[i] >= 50);
    assertTrue(error.timings[1] > success.timings[1] + success.timings[3]);
  }

  private static int pulses(HapticPattern pattern) {
    int count = 0;
    for (int i = 0; i < pattern.amplitudes.length; i += 1) if (pattern.amplitudes[i] > 0) count += 1;
    return count;
  }
}
