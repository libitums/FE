package com.libitum.host;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** iOS {@code StoryPhotoModuleTests}의 줄일 크기 표와 같다. 실제 디코딩 · 인코딩은 기기에서 본다. */
public final class StoryPhotoSizeTest {
  @Test public void landscapeShrinksToLongSide1600() {
    assertArrayEquals(new int[] {1600, 1200}, StoryPhotoSize.target(4000, 3000));
  }

  @Test public void portraitShrinksToLongSide1600() {
    assertArrayEquals(new int[] {1200, 1600}, StoryPhotoSize.target(3000, 4000));
  }

  @Test public void smallPhotoStaysAsIs() {
    assertArrayEquals(new int[] {800, 600}, StoryPhotoSize.target(800, 600));
    assertArrayEquals(new int[] {1600, 1600}, StoryPhotoSize.target(1600, 1600));
  }

  @Test public void shortSideRoundsAndNeverZero() {
    assertArrayEquals(new int[] {1600, 900}, StoryPhotoSize.target(4032, 2268));
    assertArrayEquals(new int[] {1600, 1}, StoryPhotoSize.target(20000, 2));
  }

  @Test public void invalidSizeIsNull() {
    assertNull(StoryPhotoSize.target(0, 100));
    assertNull(StoryPhotoSize.target(100, -1));
  }

  @Test public void sampleSizeKeepsLongSideAtLeastTarget() {
    assertEquals(1, StoryPhotoSize.sampleSize(800, 600));
    assertEquals(1, StoryPhotoSize.sampleSize(3000, 2000));
    assertEquals(2, StoryPhotoSize.sampleSize(4000, 3000));
    assertEquals(4, StoryPhotoSize.sampleSize(8000, 6000));
    assertEquals(4, StoryPhotoSize.sampleSize(6000, 8000));
    assertEquals(1, StoryPhotoSize.sampleSize(0, 0));
  }

  @Test public void exifOrientationsFiveToEightSwapAxes() {
    for (int orientation = 0; orientation <= 4; orientation++) {
      assertFalse(String.valueOf(orientation), StoryPhotoSize.swapsAxes(orientation));
    }
    for (int orientation = 5; orientation <= 8; orientation++) {
      assertTrue(String.valueOf(orientation), StoryPhotoSize.swapsAxes(orientation));
    }
  }

  @Test public void limits() {
    assertEquals(80, StoryPhotoSize.JPEG_QUALITY);
    assertEquals(1600, StoryPhotoSize.MAX_LONG_SIDE);
  }
}
