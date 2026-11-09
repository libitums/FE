package com.libitum.host;

/**
 * Which vibration path a {@code SoundEffectsModule.haptic(kind)} call takes. Pure, so JUnit covers
 * it without the Android runtime. Verdicts ({@code success} · {@code error}) play the media-usage
 * waveform that ignores the system touch-feedback setting (ADR-0109 D3 rev 2); keyboard taps
 * ({@code key}) play a short touch-usage tick that follows it, like the system keyboard (ADR-0112).
 */
enum HapticKindRoute {
  VERDICT,
  KEY,
  NONE;

  /** {@link #NONE} for unknown kinds, empty string or null. */
  static HapticKindRoute of(String kind) {
    if (kind == null) return NONE;
    switch (kind) {
      case "success":
      case "error":
        return VERDICT;
      case "key":
        return KEY;
      default:
        return NONE;
    }
  }
}
