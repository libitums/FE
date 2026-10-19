package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.io.File;
import java.io.IOException;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public final class AudioContentFileTest {
  @Rule public TemporaryFolder temp = new TemporaryFolder();
  private File base;
  private File root;
  private File inside;
  private File outside;

  @Before public void setUp() throws IOException {
    base = temp.newFolder();
    root = new File(base, "content-files");
    inside = new File(root, "audio/u01-water.m4a");
    outside = new File(base, "other.m4a");
    assertEquals(true, inside.getParentFile().mkdirs());
    assertEquals(true, inside.createNewFile());
    assertEquals(true, outside.createNewFile());
  }

  private static String url(File file) {
    return "file://" + file.getAbsolutePath();
  }

  @Test public void acceptsExistingFileInsideRoot() throws IOException {
    assertEquals(inside.getCanonicalFile(), AudioContentFile.forSource(url(inside), root));
  }

  @Test public void rejectsFilesOutsideRoot() {
    assertNull(AudioContentFile.forSource(url(outside), root));
    assertNull(AudioContentFile.forSource("file:///sdcard/a.m4a", root));
    assertNull(AudioContentFile.forSource("file:///etc/passwd", root));
  }

  @Test public void rejectsTraversalAndSiblingPrefix() throws IOException {
    assertNull(AudioContentFile.forSource(url(root) + "/../other.m4a", root));
    File sibling = new File(base, "content-files-evil/a.m4a");
    assertEquals(true, sibling.getParentFile().mkdirs());
    assertEquals(true, sibling.createNewFile());
    assertNull(AudioContentFile.forSource(url(sibling), root));
  }

  @Test public void rejectsMissingFileFolderAndNonFileSchemes() {
    assertNull(AudioContentFile.forSource(url(new File(root, "audio/missing.m4a")), root));
    assertNull(AudioContentFile.forSource(url(new File(root, "audio")), root));
    assertNull(AudioContentFile.forSource("https://abc.supabase.co/a.m4a", root));
    assertNull(AudioContentFile.forSource("greeting-1", root));
    assertNull(AudioContentFile.forSource(inside.getAbsolutePath(), root));
    assertNull(AudioContentFile.forSource("", root));
    assertNull(AudioContentFile.forSource(null, root));
  }
}
