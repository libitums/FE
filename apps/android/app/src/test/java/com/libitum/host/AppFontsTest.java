package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** `AppFonts`의 복사 판정(AF1). 경로 · 파일 표가 `app.css`와 맞는지는 `host-app-fonts.integration.test.mjs`가 본다. */
public final class AppFontsTest {
  // AF1: 없거나 크기가 다르면 복사하고, 같은 크기가 있으면 건너뛴다(시작마다 다시 쓰지 않는다).
  @Test public void af1CopiesOnlyWhenMissingOrDifferent() {
    assertTrue(AppFonts.needsCopy(false, 0, 134996));
    assertTrue(AppFonts.needsCopy(true, 1000, 134996));
    assertFalse(AppFonts.needsCopy(true, 134996, 134996));
  }
}
