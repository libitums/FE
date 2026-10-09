package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;

import java.io.File;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.junit.Test;

public final class SoundEffectAssetTest {
  private static final Set<String> EXPECTED_IDS = new HashSet<>(Arrays.asList(
      "button", "correct_answer", "wrong_answer", "lesson_complete",
      "pass_lesson", "failed_lesson", "ring_bell", "accept_call"));

  @Test public void sa1_allEightIdsResolveToTheirOwnConstant() {
    Set<String> ids = new HashSet<>();
    for (SoundEffectAsset asset : SoundEffectAsset.values()) {
      ids.add(asset.id());
      assertSame(asset.id(), asset, SoundEffectAsset.fromId(asset.id()));
    }
    assertEquals(EXPECTED_IDS, ids);
    assertEquals(8, SoundEffectAsset.values().length);
  }

  @Test public void sa2_rejectsUnknownIdsPathsAndExtensions() {
    for (String id : new String[] {
        null, "", "unknown", "Button", "button.mp3", "sfx/button", "../audio/greeting-1"}) {
      assertNull(String.valueOf(id), SoundEffectAsset.fromId(id));
    }
  }

  @Test public void sa3_assetPathVolumeAndLoopsFollowTheContract() {
    assertVolume(SoundEffectAsset.BUTTON, 0.25f);
    assertVolume(SoundEffectAsset.CORRECT_ANSWER, 0.5f);
    assertVolume(SoundEffectAsset.WRONG_ANSWER, 0.5f);
    assertVolume(SoundEffectAsset.LESSON_COMPLETE, 0.55f);
    assertVolume(SoundEffectAsset.PASS_LESSON, 0.55f);
    assertVolume(SoundEffectAsset.FAILED_LESSON, 0.55f);
    assertVolume(SoundEffectAsset.RING_BELL, 0.35f);
    assertVolume(SoundEffectAsset.ACCEPT_CALL, 0.4f);
    for (SoundEffectAsset asset : SoundEffectAsset.values()) {
      assertEquals("sfx/" + asset.id() + ".mp3", asset.assetPath());
      assertEquals(asset.name(), asset == SoundEffectAsset.RING_BELL, asset.loops());
    }
  }

  @Test public void sa4_bundledSfxDirectoryMatchesTheEnumExactly() {
    File dir = new File("../../ios/Host/sfx");
    String[] names = dir.list((d, name) -> name.endsWith(".mp3"));
    assertNotNull("missing " + dir.getAbsolutePath(), names);
    Set<String> expected = new HashSet<>();
    for (SoundEffectAsset asset : SoundEffectAsset.values()) {
      expected.add(asset.id() + ".mp3");
    }
    assertEquals(expected, new HashSet<>(Arrays.asList(names)));
    assertFalse(names.length == 0);
  }

  private static void assertVolume(SoundEffectAsset asset, float volume) {
    assertEquals(asset.name(), volume, asset.volume(), 0.0001f);
  }
}
