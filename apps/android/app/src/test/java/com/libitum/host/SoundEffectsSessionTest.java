package com.libitum.host;

import static com.libitum.host.SoundEffectAsset.ACCEPT_CALL;
import static com.libitum.host.SoundEffectAsset.BUTTON;
import static com.libitum.host.SoundEffectAsset.CORRECT_ANSWER;
import static com.libitum.host.SoundEffectAsset.RING_BELL;
import static com.libitum.host.SoundEffectAsset.WRONG_ANSWER;
import static com.libitum.host.SoundEffectsSession.Play.ALREADY_RINGING;
import static com.libitum.host.SoundEffectsSession.Play.PLAY;
import static com.libitum.host.SoundEffectsSession.Play.START_RING;
import static com.libitum.host.SoundEffectsSession.Play.UNAVAILABLE;
import static com.libitum.host.SoundEffectsSession.Play.WAIT_FOR_LOAD;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class SoundEffectsSessionTest {
  @Test public void ss1_loadedShortEffectPlaysEveryRequest() {
    SoundEffectsSession session = new SoundEffectsSession();
    session.onLoaded(BUTTON);
    assertEquals(PLAY, session.request(BUTTON));
    assertEquals(PLAY, session.request(BUTTON));
  }

  @Test public void ss2_requestBeforeLoadWaitsOnceAndRunsOnLoad() {
    SoundEffectsSession session = new SoundEffectsSession();
    assertEquals(WAIT_FOR_LOAD, session.request(CORRECT_ANSWER));
    assertEquals(WAIT_FOR_LOAD, session.request(CORRECT_ANSWER));
    assertTrue(session.onLoaded(CORRECT_ANSWER));
    assertFalse(session.onLoaded(CORRECT_ANSWER));
  }

  @Test public void ss3_loadedBellStartsOnceUntilStopped() {
    SoundEffectsSession session = new SoundEffectsSession();
    session.onLoaded(RING_BELL);
    assertEquals(START_RING, session.request(RING_BELL));
    assertEquals(ALREADY_RINGING, session.request(RING_BELL));
    assertTrue(session.isRinging());
    session.stopRing();
    assertFalse(session.isRinging());
    assertEquals(START_RING, session.request(RING_BELL));
  }

  @Test public void ss4_stopAllClearsRingAndWaitingEffects() {
    SoundEffectsSession session = new SoundEffectsSession();
    session.onLoaded(RING_BELL);
    assertEquals(START_RING, session.request(RING_BELL));
    assertEquals(WAIT_FOR_LOAD, session.request(CORRECT_ANSWER));
    assertTrue(session.isRinging());
    session.stopAll();
    assertFalse(session.isRinging());
    assertFalse(session.onLoaded(CORRECT_ANSWER));
  }

  @Test public void ss5_loadFailureMakesTheAssetUnavailable() {
    SoundEffectsSession session = new SoundEffectsSession();
    assertEquals(WAIT_FOR_LOAD, session.request(CORRECT_ANSWER));
    session.onLoadFailed(CORRECT_ANSWER);
    assertEquals(UNAVAILABLE, session.request(CORRECT_ANSWER));
    assertFalse(session.onLoaded(CORRECT_ANSWER));

    assertEquals(WAIT_FOR_LOAD, session.request(RING_BELL));
    assertTrue(session.isRinging());
    session.onLoadFailed(RING_BELL);
    assertFalse(session.isRinging());
    assertEquals(UNAVAILABLE, session.request(RING_BELL));
  }

  @Test public void ss6_differentShortEffectsAreIndependent() {
    SoundEffectsSession session = new SoundEffectsSession();
    session.onLoaded(BUTTON);
    session.onLoaded(WRONG_ANSWER);
    assertEquals(PLAY, session.request(BUTTON));
    assertEquals(PLAY, session.request(WRONG_ANSWER));
    assertEquals(PLAY, session.request(BUTTON));
    assertEquals(WAIT_FOR_LOAD, session.request(ACCEPT_CALL));
    assertEquals(PLAY, session.request(BUTTON));
    assertEquals(PLAY, session.request(WRONG_ANSWER));
  }

  @Test public void ss7_stopRingWhileBellLoadingCancelsTheRing() {
    SoundEffectsSession session = new SoundEffectsSession();
    assertEquals(WAIT_FOR_LOAD, session.request(RING_BELL));
    session.stopRing();
    assertFalse(session.isRinging());
    assertFalse(session.onLoaded(RING_BELL));
  }
}
