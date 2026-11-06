package com.libitum.host;

import android.view.HapticFeedbackConstants;

/**
 * Picks the platform haptic constant for a `SoundEffectsModule.haptic(kind)` call. Pure, so JUnit
 * covers the whole table; the SDK level is a parameter instead of a read of `Build.VERSION`.
 * Only platform constants: CONFIRM / REJECT exist from API 30; older levels fall back to
 * CONTEXT_CLICK (a medium click — KEYBOARD_TAP is often imperceptible on cheap motors) and
 * LONG_PRESS, which differ in strength, not in meaning.
 */
final class HapticFeedbackConstant {
  /** No haptic: unknown kind, empty string or null. Never a valid HapticFeedbackConstants value. */
  static final int NONE = -1;

  private HapticFeedbackConstant() {}

  static int of(String kind, int sdkInt) {
    if (kind == null) return NONE;
    switch (kind) {
      case "success":
        return sdkInt >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.CONTEXT_CLICK;
      case "error":
        return sdkInt >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;
      default:
        return NONE;
    }
  }
}
