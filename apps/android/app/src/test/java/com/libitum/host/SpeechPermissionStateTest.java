package com.libitum.host;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** The microphone state drives the app's primer and denied sheets (ADR-0206): unasked → primer, denied → Open Settings. */
public final class SpeechPermissionStateTest {
  @Test public void grantedWinsWhetherOrNotAsked() {
    assertEquals("granted", SpeechPermissionState.microphone(true, false));
    assertEquals("granted", SpeechPermissionState.microphone(true, true));
  }

  @Test public void notGrantedSplitsUnaskedFromDenied() {
    assertEquals("not-determined", SpeechPermissionState.microphone(false, false));
    assertEquals("denied", SpeechPermissionState.microphone(false, true));
  }
}
