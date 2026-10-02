package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public final class CompletionAnnouncementContentTest {
  @Test public void preservesOriginalTextIncludingWhitespaceAndMultipleLanguages() {
    for (String text : new String[] {"문항을 모두 마쳤어요, 결과 보기", " All done — 결과 보기\n", ""}) {
      assertEquals(text, CompletionAnnouncementContent.from(text));
    }
  }

  @Test public void rejectsMissingOrNonStringContent() {
    assertNull(CompletionAnnouncementContent.from(null));
    assertNull(CompletionAnnouncementContent.from(42));
  }
}
