package com.libitum.host;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public final class HandwritingTraceMathTest {
  @Test public void centerUsesInkBoundsRatherThanFontBox() {
    byte[] raw = {0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
    byte[] moved = HandwritingTraceMath.center(raw, 5, 4);
    assertArrayEquals(new int[] {1, 1, 2, 1}, HandwritingTraceMath.bounds(moved, 5, 4));
    assertEquals(2, HandwritingTraceMath.area(moved));
    assertNull(HandwritingTraceMath.bounds(new byte[20], 5, 4));
  }

  @Test public void dilationIsSquareAndClampedToCanvas() {
    byte[] one = new byte[25];
    one[12] = 1;
    assertEquals(9, HandwritingTraceMath.area(HandwritingTraceMath.dilate(one, 5, 5, 1)));
    assertEquals(25, HandwritingTraceMath.area(HandwritingTraceMath.dilate(one, 5, 5, 10000)));
    assertEquals(1, HandwritingTraceMath.intersection(one, one));
    assertEquals(0, HandwritingTraceMath.intersection(one, new byte[25]));
  }

  @Test public void rectangularDilationDoesNotLeakInkBetweenRows() {
    byte[] corner = new byte[18];
    corner[0] = 1;
    byte[] grown = HandwritingTraceMath.dilate(corner, 6, 3, 1);
    assertEquals(4, HandwritingTraceMath.area(grown));
    assertArrayEquals(new int[] {0, 0, 2, 2}, HandwritingTraceMath.bounds(grown, 6, 3));
  }
}
