package com.libitum.host;

/** One speech request and the observations collected while it is active. */
final class SpeechRecognitionSession {
  final boolean requestedOnDevice;
  final boolean supportsOnDevice;
  private final long startedAtMs;
  private boolean finished;
  private int bufferCount;
  private int levelCount;
  private double level;
  private double peakLevel;
  private double levelSum;

  SpeechRecognitionSession(boolean requestedOnDevice, boolean supportsOnDevice, long startedAtMs) {
    this.requestedOnDevice = requestedOnDevice;
    this.supportsOnDevice = supportsOnDevice;
    this.startedAtMs = startedAtMs;
  }

  boolean requiresOnDevice() { return requestedOnDevice && supportsOnDevice; }
  boolean isFinished() { return finished; }
  boolean finish() {
    if (finished) return false;
    finished = true;
    return true;
  }

  // RecognitionListener reports a service-defined dB value, not PCM samples.
  // This bounded conversion is a meter approximation, not a raw microphone RMS.
  void observeLevel(float rmsDb) {
    if (!Float.isFinite(rmsDb)) return;
    level = Math.max(0, Math.min(1, Math.pow(10, rmsDb / 20.0)));
    peakLevel = Math.max(peakLevel, level);
    levelSum += level;
    levelCount++;
  }

  void observeBuffer() { bufferCount++; }
  int bufferCount() { return bufferCount; }
  double level() { return level; }
  double peakLevel() { return peakLevel; }
  double averageLevel() { return levelCount == 0 ? 0 : levelSum / levelCount; }
  long durationMs(long nowMs) { return Math.max(0, nowMs - startedAtMs); }
}
