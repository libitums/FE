package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public final class AudioRemoteSourceTest {
  private static final String BUCKET_URL =
      "https://abc.supabase.co/storage/v1/object/public/content/audio/u01-water/d-01.m4a";

  @Test public void returnsAbsoluteHttpsUrlsUnchanged() {
    assertEquals(BUCKET_URL, AudioRemoteSource.forSource(BUCKET_URL));
    assertEquals("HTTPS://abc.supabase.co/a.m4a",
        AudioRemoteSource.forSource("HTTPS://abc.supabase.co/a.m4a"));
  }

  @Test public void rejectsEverythingThatIsNotHttpsWithAHost() {
    String[] rejected = {
      "",
      "http://abc.supabase.co/a.m4a",
      "file:///sdcard/a.m4a",
      "content://x/a",
      "data:audio/mp4;base64,AA",
      "https://",
      "https:///a.m4a",
      "//abc.supabase.co/a.m4a",
      "greeting-1",
      "audio/greeting-1",
      "https://exa mple.com/a.m4a",
    };
    for (String source : rejected) {
      assertNull(source, AudioRemoteSource.forSource(source));
    }
    assertNull(AudioRemoteSource.forSource(null));
  }

  @Test public void doesNotOverlapWithBundledAssetPaths() {
    assertNull(AudioAssetPath.forSource(BUCKET_URL));
    assertNull(AudioRemoteSource.forSource("greeting-1"));
    assertEquals("audio/greeting-1.m4a", AudioAssetPath.forSource("greeting-1"));
  }
}
