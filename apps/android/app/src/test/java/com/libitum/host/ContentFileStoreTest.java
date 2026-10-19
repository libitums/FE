package com.libitum.host;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public final class ContentFileStoreTest {
  private static final String URL = "https://abc.supabase.co/storage/v1/object/public/content/x";
  @Rule public TemporaryFolder temp = new TemporaryFolder();
  private File root;

  @Before public void setUp() throws IOException {
    root = new File(temp.newFolder(), "content-files");
  }

  private static ContentFileStore.Fetcher serving(int code, byte[] body) {
    return url -> new ContentFileStore.Response() {
      @Override public int code() { return code; }

      @Override public InputStream body() { return new ByteArrayInputStream(body); }

      @Override public void close() {}
    };
  }

  private static ContentFileStore.Fetcher failingMidBody() {
    return url -> new ContentFileStore.Response() {
      @Override public int code() { return 200; }

      @Override public InputStream body() {
        return new InputStream() {
          private int sent;

          @Override public int read() throws IOException {
            if (sent++ < 3) return 'a';
            throw new IOException("reset");
          }
        };
      }

      @Override public void close() {}
    };
  }

  private static ContentFileStore.Fetcher unreachable() {
    return url -> { throw new IOException("offline"); };
  }

  private ContentFileStore store(ContentFileStore.Fetcher fetcher) {
    return new ContentFileStore(root, fetcher);
  }

  private void assertNoTmpLeftovers() {
    File[] left = new File(root, ".tmp").listFiles();
    assertTrue(left == null || left.length == 0);
  }

  @Test public void validatesPathsByContract() {
    String[] ok = {"a", "images/items/pen.png", "audio/u01-water.m4a", "A_b-c.d", "x/.hidden"};
    for (String path : ok) assertTrue(path, ContentFileStore.validPath(path));
    StringBuilder tooLong = new StringBuilder();
    for (int i = 0; i < 257; i++) tooLong.append('a');
    String[] bad = {null, "", "/a", "a//b", "a/", "a/../b", "..", ".", "a/./b", "a b", "a\\b",
        "한글", "a?b", "a:b", "a%2e", tooLong.toString()};
    for (String path : bad) assertFalse(String.valueOf(path), ContentFileStore.validPath(path));
    assertTrue(ContentFileStore.validPath(tooLong.substring(1)));
  }

  @Test public void rejectsNonHttpsUrls() {
    ContentFileStore store = store(serving(200, new byte[] {1}));
    String[] bad = {null, "", "http://abc.supabase.co/a", "file:///etc/passwd", "ftp://a/b",
        "https://", "//abc/a", "x"};
    for (String url : bad) {
      assertEquals(String.valueOf(url), "invalid", store.download(url, "a/b").status);
    }
    assertFalse(root.exists());
  }

  @Test public void rejectsBadPathsAndTmpFolder() {
    ContentFileStore store = store(serving(200, new byte[] {1}));
    for (String path : new String[] {"../a", "/a", "a//b", "", ".tmp", ".tmp/x"}) {
      assertEquals(path, "invalid", store.download(URL, path).status);
    }
  }

  @Test public void savesAndMovesFileWithByteCount() throws IOException {
    byte[] body = "hello".getBytes(StandardCharsets.UTF_8);
    ContentFileStore.Result result = store(serving(200, body)).download(URL, "images/items/pen.png");
    assertEquals("saved", result.status);
    assertEquals("5", result.detail);
    File target = new File(root, "images/items/pen.png");
    assertArrayEquals(body, Files.readAllBytes(target.toPath()));
    assertNoTmpLeftovers();
  }

  @Test public void overwritesExistingFile() throws IOException {
    store(serving(200, "old".getBytes(StandardCharsets.UTF_8))).download(URL, "a/b.txt");
    ContentFileStore.Result result =
        store(serving(200, "newer".getBytes(StandardCharsets.UTF_8))).download(URL, "a/b.txt");
    assertEquals("5", result.detail);
    assertEquals("newer", new String(Files.readAllBytes(new File(root, "a/b.txt").toPath()),
        StandardCharsets.UTF_8));
  }

  @Test public void httpErrorLeavesNoTargetAndNoTmp() {
    ContentFileStore.Result result = store(serving(404, new byte[0])).download(URL, "a/b.png");
    assertEquals("http", result.status);
    assertEquals("404", result.detail);
    assertFalse(new File(root, "a/b.png").exists());
    assertNoTmpLeftovers();
  }

  @Test public void networkFailureLeavesNoTargetAndNoTmp() {
    ContentFileStore.Result result = store(unreachable()).download(URL, "a/b.png");
    assertEquals("network", result.status);
    assertFalse(new File(root, "a/b.png").exists());
    assertNoTmpLeftovers();
  }

  @Test public void failureMidBodyIsNetworkAndKeepsPreviousFile() throws IOException {
    store(serving(200, "keep".getBytes(StandardCharsets.UTF_8))).download(URL, "a/b.png");
    ContentFileStore.Result result = store(failingMidBody()).download(URL, "a/b.png");
    assertEquals("network", result.status);
    assertEquals("keep", new String(Files.readAllBytes(new File(root, "a/b.png").toPath()),
        StandardCharsets.UTF_8));
    assertNoTmpLeftovers();
  }

  @Test public void ioFailureWhenParentIsAFile() throws IOException {
    store(serving(200, new byte[] {1})).download(URL, "a");
    ContentFileStore.Result result = store(serving(200, new byte[] {1})).download(URL, "a/b");
    assertEquals("io", result.status);
    assertNoTmpLeftovers();
  }

  @Test public void fileUrlIsEmptyWhenMissingOrInvalid() {
    ContentFileStore store = store(serving(200, new byte[] {1}));
    assertEquals("", store.fileUrl("a/b.png"));
    assertEquals("", store.fileUrl("../a"));
    assertEquals("", store.fileUrl(""));
    store.download(URL, "a/b.png");
    assertEquals("file://" + new File(root, "a/b.png").getAbsolutePath(), store.fileUrl("a/b.png"));
    assertEquals("", store.fileUrl("a"));
  }

  @Test public void removesFileFolderAndMissing() {
    ContentFileStore store = store(serving(200, new byte[] {1}));
    store.download(URL, "audio/u01/d-01.m4a");
    store.download(URL, "audio/u01/d-02.m4a");
    store.download(URL, "images/p.png");
    assertEquals("removed", store.remove("audio/u01").status);
    assertFalse(new File(root, "audio/u01").exists());
    assertEquals("removed", store.remove("images/p.png").status);
    assertEquals("removed", store.remove("nothing/here").status);
    assertEquals("invalid", store.remove("../x").status);
    assertEquals("invalid", store.remove("/images").status);
  }
}
