package com.libitum.host;

/** Tracks a single in-flight Play review request on the activity's main thread. */
final class ReviewRequestGate {
  private boolean inFlight;

  boolean begin() {
    if (inFlight) return false;
    inFlight = true;
    return true;
  }

  void finish() { inFlight = false; }

  boolean isInFlight() { return inFlight; }
}
