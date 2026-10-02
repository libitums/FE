package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class SpeechRecognitionSessionTest {
  @Test public void resultCanSettleOnlyOnce() {
    SpeechRecognitionSession session = new SpeechRecognitionSession(true, true, 100);
    assertTrue(session.requiresOnDevice());
    assertFalse(session.isFinished());
    assertTrue(session.finish());
    assertTrue(session.isFinished());
    assertFalse(session.finish());
    assertEquals(250, session.durationMs(350));
  }

  @Test public void missingOnDeviceServiceIsVisible() {
    SpeechRecognitionSession session = new SpeechRecognitionSession(true, false, 200);
    assertFalse(session.requiresOnDevice());
    assertEquals(0, session.durationMs(100));
  }

  @Test public void levelsAndBuffersRemainFiniteAndBounded() {
    SpeechRecognitionSession session = new SpeechRecognitionSession(false, true, 0);
    session.observeLevel(-20);
    session.observeLevel(0);
    session.observeLevel(Float.NaN);
    session.observeBuffer();
    assertEquals(1, session.bufferCount());
    assertEquals(1, session.level(), 0.0001);
    assertEquals(1, session.peakLevel(), 0.0001);
    assertEquals(0.55, session.averageLevel(), 0.0001);
  }
}
