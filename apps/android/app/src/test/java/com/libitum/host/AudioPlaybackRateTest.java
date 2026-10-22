package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class AudioPlaybackRateTest {
  private static final float DELTA = 0.0001f;

  /** J1: invalid or out-of-range requests normalize to 1; in-range values pass through. */
  @Test public void normalizedFallsBackToNormalSpeedForInvalidOrOutOfRangeValues() {
    double[] invalid = {
        Double.NaN,
        Double.POSITIVE_INFINITY,
        Double.NEGATIVE_INFINITY,
        0.0,
        0.49,
        2.01,
    };
    for (double requested : invalid) {
      assertEquals("should normalize " + requested, 1f, AudioPlaybackRate.normalized(requested), DELTA);
    }
  }

  @Test public void normalizedKeepsValuesInsideTheSupportedRange() {
    assertEquals(0.5f, AudioPlaybackRate.normalized(0.5), DELTA);
    assertEquals(0.85f, AudioPlaybackRate.normalized(0.85), DELTA);
    assertEquals(1f, AudioPlaybackRate.normalized(1.0), DELTA);
    assertEquals(2.0f, AudioPlaybackRate.normalized(2.0), DELTA);
  }

  /** J2: only a rate other than 1 changes speed. */
  @Test public void changesSpeedIsFalseOnlyForNormalSpeed() {
    assertFalse(AudioPlaybackRate.changesSpeed(1f));
    assertFalse(AudioPlaybackRate.changesSpeed(AudioPlaybackRate.NORMAL));
    assertTrue(AudioPlaybackRate.changesSpeed(0.85f));
  }
}
