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

  /**
   * Whether the key tick may play. From API 33 the touch usage is scaled by the system touch-feedback
   * setting itself; below that the vibrator does not reliably check it (only
   * View.performHapticFeedback did), so the controller reads Settings.System.HAPTIC_FEEDBACK_ENABLED
   * and passes it here (0 = off).
   */
  static boolean keyTickAllowed(int sdk, int hapticFeedbackSetting) {
    return sdk >= 33 || hapticFeedbackSetting != 0;
  }
}
