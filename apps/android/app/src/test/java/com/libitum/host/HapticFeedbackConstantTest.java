package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import android.view.HapticFeedbackConstants;
import org.junit.Test;

public final class HapticFeedbackConstantTest {
  @Test public void api30AndLaterUseConfirmAndReject() {
    assertEquals(HapticFeedbackConstants.CONFIRM, HapticFeedbackConstant.of("success", 30));
    assertEquals(HapticFeedbackConstants.REJECT, HapticFeedbackConstant.of("error", 30));
    assertEquals(HapticFeedbackConstants.CONFIRM, HapticFeedbackConstant.of("success", 36));
    assertEquals(HapticFeedbackConstants.REJECT, HapticFeedbackConstant.of("error", 36));
  }

  @Test public void olderLevelsFallBackToKeyboardTapAndLongPress() {
    assertEquals(HapticFeedbackConstants.CONTEXT_CLICK, HapticFeedbackConstant.of("success", 26));
    assertEquals(HapticFeedbackConstants.LONG_PRESS, HapticFeedbackConstant.of("error", 26));
    assertEquals(HapticFeedbackConstants.CONTEXT_CLICK, HapticFeedbackConstant.of("success", 29));
    assertEquals(HapticFeedbackConstants.LONG_PRESS, HapticFeedbackConstant.of("error", 29));
  }

  @Test public void unknownKindsAreNoneOnAnySdk() {
    assertEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstant.of(null, 30));
    assertEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstant.of("", 30));
    assertEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstant.of("SUCCESS", 30));
    assertEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstant.of("confirm", 30));
    assertEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstant.of("confirm", 26));
  }

  @Test public void noneIsMinusOneAndDistinctFromEveryConstant() {
    assertEquals(-1, HapticFeedbackConstant.NONE);
    assertNotEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstants.CONFIRM);
    assertNotEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstants.REJECT);
    assertNotEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstants.CONTEXT_CLICK);
    assertNotEquals(HapticFeedbackConstant.NONE, HapticFeedbackConstants.LONG_PRESS);
  }
}
