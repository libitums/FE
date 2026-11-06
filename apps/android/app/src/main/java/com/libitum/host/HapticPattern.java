package com.libitum.host;

/**
 * The verdict vibration for a `SoundEffectsModule.haptic(kind)` call, as a one-shot waveform
 * (timings in ms, amplitudes 0..255). Pure, so JUnit covers the whole table without the Android
 * runtime. The controller plays it through {@code Vibrator}, so it vibrates even when the system
 * touch-feedback setting is off (ADR-0109 D3 rev 2).
 */
final class HapticPattern {
  // Rhythm carries the meaning, not amplitude: most budget motors have no amplitude control and
  // pulses under ~50 ms barely spin them up. A quick double tap reads as "done", one long buzz as
  // "no" (the same split as iOS .success / .error).
  private static final HapticPattern SUCCESS =
      new HapticPattern(new long[] {0, 55, 70, 55}, new int[] {0, 255, 0, 255});
  private static final HapticPattern ERROR = new HapticPattern(new long[] {0, 220}, new int[] {0, 255});

  final long[] timings;
  final int[] amplitudes;

  private HapticPattern(long[] timings, int[] amplitudes) {
    this.timings = timings;
    this.amplitudes = amplitudes;
  }

  /** {@code null} for unknown kinds, empty string or null. */
  static HapticPattern of(String kind) {
    if (kind == null) return null;
    switch (kind) {
      case "success":
        return SUCCESS;
      case "error":
        return ERROR;
      default:
        return null;
    }
  }
}
