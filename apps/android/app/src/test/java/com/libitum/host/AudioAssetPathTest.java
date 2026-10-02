package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public final class AudioAssetPathTest {
  @Test public void mapsStableContentIdsToM4aAssets() {
    assertEquals("audio/greeting-1.m4a", AudioAssetPath.forSource("greeting-1"));
    assertEquals("audio/tutorial-cabin-announcement.m4a",
        AudioAssetPath.forSource("tutorial-cabin-announcement"));
  }

  @Test public void rejectsPathsExtensionsAndEmptyIds() {
    for (String source : new String[] {"", "../greeting-1", "audio/greeting-1", "greeting-1.m4a", "AUDIO"}) {
      assertNull(AudioAssetPath.forSource(source));
    }
    assertNull(AudioAssetPath.forSource(null));
  }
}
