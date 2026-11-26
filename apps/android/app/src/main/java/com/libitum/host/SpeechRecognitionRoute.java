package com.libitum.host;

import java.util.List;
import java.util.Locale;

/**
 * Pure rules for routing a ko-KR request between the on-device and the network recognizer.
 *
 * <p>{@code isOnDeviceRecognitionAvailable} only says that some on-device service exists, not that it
 * has the Korean model. Without the model the on-device recognizer fails with a language error, so the
 * controller retries once on the network recognizer. These rules decide when, without Android types.
 */
final class SpeechRecognitionRoute {
  static final String PACK_INSTALLED = "installed";
  static final String PACK_DOWNLOADING = "downloading";
  static final String PACK_AVAILABLE = "available";
  static final String PACK_UNSUPPORTED = "unsupported";
  static final String PACK_UNKNOWN = "unknown";

  static final String FALLBACK_NONE = "none";
  static final String FALLBACK_PACK_MISSING = "pack-missing";
  static final String FALLBACK_ON_DEVICE_ERROR = "on-device-error";

  /** Errors that arrive this soon after listening starts, before any text, mean the service never ran. */
  static final long EARLY_FAILURE_MS = 1500;

  // SpeechRecognizer error codes, kept as literals so this class stays free of Android types.
  private static final int ERROR_SERVER = 4;
  private static final int ERROR_CLIENT = 5;
  private static final int ERROR_SERVER_DISCONNECTED = 11;
  private static final int ERROR_LANGUAGE_NOT_SUPPORTED = 12;
  private static final int ERROR_LANGUAGE_UNAVAILABLE = 13;

  private SpeechRecognitionRoute() { }

  /** True for a Korean language tag in either BCP 47 ({@code ko-KR}) or Java ({@code ko_KR}) form. */
  static boolean isKorean(String languageTag) {
    if (languageTag == null) return false;
    String tag = languageTag.toLowerCase(Locale.ROOT);
    return tag.equals("ko") || tag.startsWith("ko-") || tag.startsWith("ko_");
  }

  private static boolean containsKorean(List<String> tags) {
    if (tags == null) return false;
    for (String tag : tags) {
      if (isKorean(tag)) return true;
    }
    return false;
  }

  /** Maps one {@code RecognitionSupport} answer for the on-device recognizer to the pack status. */
  static String koreanPackOf(List<String> installed, List<String> pending, List<String> supported) {
    if (containsKorean(installed)) return PACK_INSTALLED;
    if (containsKorean(pending)) return PACK_DOWNLOADING;
    if (containsKorean(supported)) return PACK_AVAILABLE;
    return PACK_UNSUPPORTED;
  }

  /** A confirmed missing model skips the on-device recognizer; an unanswered check does not. */
  static boolean fallBackBeforeStart(String koreanPack) {
    return PACK_AVAILABLE.equals(koreanPack) || PACK_DOWNLOADING.equals(koreanPack)
        || PACK_UNSUPPORTED.equals(koreanPack);
  }

  /**
   * Whether an on-device error should be retried on the network recognizer. Language errors always
   * are; service errors only right after start with no text, so a real mid-speech failure stays one.
   */
  static boolean fallBackOnError(int error, long listeningMs, boolean heardText) {
    if (error == ERROR_LANGUAGE_NOT_SUPPORTED || error == ERROR_LANGUAGE_UNAVAILABLE) return true;
    boolean serviceError = error == ERROR_SERVER || error == ERROR_CLIENT
        || error == ERROR_SERVER_DISCONNECTED;
    return serviceError && !heardText && listeningMs <= EARLY_FAILURE_MS;
  }
}
