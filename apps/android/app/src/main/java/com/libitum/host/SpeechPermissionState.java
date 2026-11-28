package com.libitum.host;

/**
 * Names the microphone permission state the JS speech gate reads (ADR-0206). Android has no "not asked yet" query, so the
 * controller remembers whether it has asked: not granted and never asked is {@code not-determined} (the app shows its primer),
 * not granted after asking is {@code denied} (the app offers Open Settings instead of asking again).
 */
final class SpeechPermissionState {
  private SpeechPermissionState() {}

  static String microphone(boolean granted, boolean asked) {
    if (granted) return "granted";
    return asked ? "denied" : "not-determined";
  }
}
