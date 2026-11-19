package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;

public final class SpeechRecognitionRouteTest {
  private static final List<String> NONE = Collections.emptyList();

  @Test public void koreanTagsMatchByLanguageNotRegion() {
    assertTrue(SpeechRecognitionRoute.isKorean("ko-KR"));
    assertTrue(SpeechRecognitionRoute.isKorean("ko_KR"));
    assertTrue(SpeechRecognitionRoute.isKorean("ko"));
    assertTrue(SpeechRecognitionRoute.isKorean("KO-kr"));
    assertFalse(SpeechRecognitionRoute.isKorean("kok-IN"));
    assertFalse(SpeechRecognitionRoute.isKorean("en-US"));
    assertFalse(SpeechRecognitionRoute.isKorean(""));
    assertFalse(SpeechRecognitionRoute.isKorean(null));
  }

  @Test public void packStatusPrefersInstalledThenPendingThenSupported() {
    List<String> ko = Arrays.asList("en-US", "ko-KR");
    assertEquals("installed", SpeechRecognitionRoute.koreanPackOf(ko, ko, ko));
    assertEquals("downloading", SpeechRecognitionRoute.koreanPackOf(NONE, ko, ko));
    assertEquals("available", SpeechRecognitionRoute.koreanPackOf(NONE, NONE, ko));
    assertEquals("unsupported", SpeechRecognitionRoute.koreanPackOf(
        Collections.singletonList("en-US"), NONE, Collections.singletonList("en-US")));
    assertEquals("unsupported", SpeechRecognitionRoute.koreanPackOf(null, null, null));
  }

  @Test public void onlyAConfirmedMissingPackSkipsTheOnDeviceRecognizer() {
    assertFalse(SpeechRecognitionRoute.fallBackBeforeStart("installed"));
    assertFalse(SpeechRecognitionRoute.fallBackBeforeStart("unknown"));
    assertTrue(SpeechRecognitionRoute.fallBackBeforeStart("available"));
    assertTrue(SpeechRecognitionRoute.fallBackBeforeStart("downloading"));
    assertTrue(SpeechRecognitionRoute.fallBackBeforeStart("unsupported"));
  }

  @Test public void languageErrorsFallBackWheneverTheyArrive() {
    // ERROR_LANGUAGE_NOT_SUPPORTED (12) and ERROR_LANGUAGE_UNAVAILABLE (13).
    assertTrue(SpeechRecognitionRoute.fallBackOnError(12, 0, false));
    assertTrue(SpeechRecognitionRoute.fallBackOnError(13, 9000, false));
    assertTrue(SpeechRecognitionRoute.fallBackOnError(13, 9000, true));
  }

  @Test public void serviceErrorsFallBackOnlyRightAfterStartBeforeAnyText() {
    // ERROR_SERVER (4), ERROR_CLIENT (5), ERROR_SERVER_DISCONNECTED (11).
    for (int code : new int[] { 4, 5, 11 }) {
      assertTrue(SpeechRecognitionRoute.fallBackOnError(code, 0, false));
      assertTrue(SpeechRecognitionRoute.fallBackOnError(code, 1500, false));
      assertFalse(SpeechRecognitionRoute.fallBackOnError(code, 1501, false));
      assertFalse(SpeechRecognitionRoute.fallBackOnError(code, 100, true));
    }
  }

  @Test public void speechOutcomesNeverFallBack() {
    // NETWORK_TIMEOUT 1, NETWORK 2, AUDIO 3, SPEECH_TIMEOUT 6, NO_MATCH 7, BUSY 8, PERMISSIONS 9, TOO_MANY 10.
    for (int code : new int[] { 0, 1, 2, 3, 6, 7, 8, 9, 10, 14, 15 }) {
      assertFalse(String.valueOf(code), SpeechRecognitionRoute.fallBackOnError(code, 0, false));
    }
  }
}
