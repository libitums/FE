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
  private double levelDb = Double.NaN;
  private String fallback = SpeechRecognitionRoute.FALLBACK_NONE;
  private int fallbackErrorCode;
  private String koreanPack = SpeechRecognitionRoute.PACK_UNKNOWN;

  SpeechRecognitionSession(boolean requestedOnDevice, boolean supportsOnDevice, long startedAtMs) {
    this.requestedOnDevice = requestedOnDevice;
    this.supportsOnDevice = supportsOnDevice;
    this.startedAtMs = startedAtMs;
  }

  boolean requiresOnDevice() {
    return requestedOnDevice && supportsOnDevice
        && SpeechRecognitionRoute.FALLBACK_NONE.equals(fallback);
  }
  boolean isFinished() { return finished; }
  boolean finish() {
    if (finished) return false;
    finished = true;
    return true;
  }

  /** Switches this request to the network recognizer once; the on-device guarantee is gone after it. */
  boolean fallBackToNetwork(String reason, int errorCode) {
    if (finished || !requiresOnDevice()) return false;
    fallback = reason;
    fallbackErrorCode = errorCode;
    return true;
  }

  String fallback() { return fallback; }
  int fallbackErrorCode() { return fallbackErrorCode; }
  String koreanPack() { return koreanPack; }
  void observeKoreanPack(String pack) {
    if (pack != null) koreanPack = pack;
  }

  // RecognitionListener reports a service-defined dB value, not PCM samples.
  // This bounded conversion is a meter approximation, not a raw microphone RMS.
  void observeLevel(float rmsDb) {
    if (!Float.isFinite(rmsDb)) return;
    levelDb = rmsDb;
    level = Math.max(0, Math.min(1, Math.pow(10, rmsDb / 20.0)));
    peakLevel = Math.max(peakLevel, level);
    levelSum += level;
    levelCount++;
  }

  void observeBuffer() { bufferCount++; }
  int bufferCount() { return bufferCount; }
  double level() { return level; }
  /** The last raw dB the service reported, or NaN before the first one. The screen meter scales it. */
  double levelDb() { return levelDb; }
  double peakLevel() { return peakLevel; }
  double averageLevel() { return levelCount == 0 ? 0 : levelSum / levelCount; }
  long durationMs(long nowMs) { return Math.max(0, nowMs - startedAtMs); }
}
