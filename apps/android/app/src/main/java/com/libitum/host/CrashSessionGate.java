package com.libitum.host;

/**
 * Decides when the app starts and ends a Sentry session. The SDK's own tracking starts a session
 * before the previous one is finalized and loses crashed sessions, so the app keeps the clock
 * (docs/adr/0061).
 */
final class CrashSessionGate {
  static final long END_AFTER_MS = 30_000;

  private boolean running;
  private long backgroundSince = -1;

  /** True once per session; a return to the foreground also cancels a pending end. */
  synchronized boolean shouldStartOnForeground() {
    backgroundSince = -1;
    if (running) return false;
    running = true;
    return true;
  }

  synchronized void onBackground(long nowMs) {
    backgroundSince = nowMs;
  }

  /** True when the app stayed in the background for END_AFTER_MS since the last stop. */
  synchronized boolean shouldEndAt(long nowMs) {
    if (!running || backgroundSince < 0 || nowMs - backgroundSince < END_AFTER_MS) return false;
    running = false;
    backgroundSince = -1;
    return true;
  }
}
