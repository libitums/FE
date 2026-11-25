package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

/** iOS {@code StoryPhotoModuleTests}의 경로 · 주소 · 페이로드 표와 같다. */
public final class StoryPhotoPathsTest {
  @Rule public TemporaryFolder temp = new TemporaryFolder();
  private File root;

  @Before public void setUp() throws IOException {
    root = new File(temp.newFolder("cache"), "story-photos");
    assertTrue(root.mkdirs());
  }

  @Test public void acceptsJpgDirectlyInsideRoot() throws IOException {
    File photo = new File(root, "0f8fad5b-d9cb-469f-a165-70867728950e.jpg");
    assertTrue(photo.createNewFile());
    assertEquals(photo.getCanonicalFile(), StoryPhotoPaths.inside(root, photo.getAbsolutePath()));
    // 아직 없는 파일도 안쪽이면 받는다 — 있는지는 호출 쪽이 missing으로 가른다.
    File absent = new File(root, "absent.jpg");
    assertEquals(absent.getCanonicalFile(), StoryPhotoPaths.inside(root, absent.getAbsolutePath()));
  }

  @Test public void rejectsOutsideDotDotAndOtherKinds() {
    String base = root.getAbsolutePath();
    String[] paths = {
      null, "", "relative.jpg", base, base + "/", base + "/../outside.jpg", base + "/x/../y.jpg",
      base + "/photo.png", base + "/photo.jpg.txt", base + "/capture/raw.jpg",
      new File(root.getParentFile(), "story-photos-evil/a.jpg").getAbsolutePath(),
      new File(root.getParentFile(), "a.jpg").getAbsolutePath(), "/etc/passwd",
      base + "/a\u0000.jpg", "file://" + base + "/a.jpg",
    };
    for (String path : paths) assertNull(String.valueOf(path), StoryPhotoPaths.inside(root, path));
  }

  @Test public void fileNameIsLowercaseUuidJpg() {
    String name = StoryPhotoPaths.newFileName();
    assertTrue(name, name.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg"));
    assertFalse(name.equals(StoryPhotoPaths.newFileName()));
  }

  @Test public void onlyHttpsUploads() {
    assertTrue(StoryPhotoPaths.isHttps("https://abc.supabase.co/storage/v1/object/story-photos/u/a.jpg"));
    String[] urls = {
      null, "", "http://abc.supabase.co/x", "https://", "ftp://x", "HTTPS//x", "file:///tmp/a.jpg",
      "https://a b.example/x", "javascript:alert(1)",
    };
    for (String url : urls) assertFalse(String.valueOf(url), StoryPhotoPaths.isHttps(url));
  }

  @Test public void sourceIsCameraOrLibrary() {
    assertEquals("camera", StoryPhotoPaths.source("camera"));
    assertEquals("library", StoryPhotoPaths.source("library"));
    for (String source : new String[] {null, "", "Camera", "gallery", "library "}) {
      assertNull(String.valueOf(source), StoryPhotoPaths.source(source));
    }
  }

  @Test public void expiresAfter24Hours() {
    long now = 1_000_000_000_000L;
    long day = 24L * 60 * 60 * 1000;
    assertFalse(StoryPhotoPaths.expired(now - day + 1, now));
    assertTrue(StoryPhotoPaths.expired(now - day - 1, now));
  }

  @Test public void contentTypeHeaderIsNotOverridden() {
    assertFalse(StoryPhotoPaths.forwardsHeader("Content-Type"));
    assertFalse(StoryPhotoPaths.forwardsHeader("content-type"));
    assertTrue(StoryPhotoPaths.forwardsHeader("Authorization"));
    assertTrue(StoryPhotoPaths.forwardsHeader("apikey"));
    assertTrue(StoryPhotoPaths.forwardsHeader("x-upsert"));
    assertFalse(StoryPhotoPaths.forwardsHeader(null));
    assertFalse(StoryPhotoPaths.forwardsHeader(""));
  }

  @Test public void pickedPayloadHasStringValues() {
    Map<String, String> payload =
        StoryPhotoPaths.picked(new File("/data/cache/story-photos/a.jpg"), 1600, 1200, 234567L);
    assertEquals("picked", payload.get("status"));
    assertEquals("file:///data/cache/story-photos/a.jpg", payload.get("url"));
    assertEquals("/data/cache/story-photos/a.jpg", payload.get("path"));
    assertEquals("1600", payload.get("width"));
    assertEquals("1200", payload.get("height"));
    assertEquals("234567", payload.get("bytes"));
    assertEquals(6, payload.size());
  }

  @Test public void statusAndHttpPayloads() {
    assertEquals(Map.of("status", "cancelled"), StoryPhotoPaths.status("cancelled"));
    assertEquals(Map.of("status", "http", "code", "403", "body", "{\"error\":\"x\"}"),
        StoryPhotoPaths.http(403, "{\"error\":\"x\"}".getBytes(StandardCharsets.UTF_8), 15));
  }

  @Test public void httpBodyIsCappedAt64KB() {
    byte[] big = new byte[70_000];
    Arrays.fill(big, (byte) 'a');
    assertEquals(65_536, StoryPhotoPaths.BODY_LIMIT);
    assertEquals(65_536, StoryPhotoPaths.http(200, big, big.length).get("body").length());
    assertEquals("", StoryPhotoPaths.http(204, new byte[0], 0).get("body"));
  }
}
