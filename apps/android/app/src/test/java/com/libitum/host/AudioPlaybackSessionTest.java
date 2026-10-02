package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertEquals;

import org.junit.Test;

public final class AudioPlaybackSessionTest {
  @Test public void replacementDropsOldCompletionAndDeliversNewOneOnce() {
    AudioPlaybackSession session = new AudioPlaybackSession();
    int[] calls = new int[2];
    long first = session.replace(() -> calls[0]++);
    long second = session.replace(() -> calls[1]++);
    assertFalse(session.isCurrent(first));
    assertTrue(session.isCurrent(second));
    session.finish(first);
    session.finish(second);
    session.finish(second);
    assertEquals(0, calls[0]);
    assertEquals(1, calls[1]);
  }

  @Test public void stopDropsCompletion() {
    AudioPlaybackSession session = new AudioPlaybackSession();
    int[] calls = new int[1];
    long generation = session.replace(() -> calls[0]++);
    session.cancel();
    assertFalse(session.isCurrent(generation));
    session.finish(generation);
    assertEquals(0, calls[0]);
  }
}
