package com.libitum.host;

/** Normalizes a requested playback speed; the speed itself is chosen by the JS caller. */
final class AudioPlaybackRate {
  static final float NORMAL = 1f;
  private static final double MIN = 0.5;
  private static final double MAX = 2.0;

  private AudioPlaybackRate() {}

  /** Invalid or out-of-range (outside 0.5 to 2.0) requests become {@link #NORMAL}. */
  static float normalized(double requested) {
    if (Double.isNaN(requested) || Double.isInfinite(requested)) return NORMAL;
    if (requested < MIN || requested > MAX) return NORMAL;
    return (float) requested;
  }

  /** Only a rate other than normal touches the player's playback params. */
  static boolean changesSpeed(float rate) {
    return rate != NORMAL;
  }
}
