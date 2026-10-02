package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import com.lynx.react.bridge.JavaOnlyMap;
import org.junit.Test;

public final class CompletionAnnouncementContentTest {
  @Test public void preservesOriginalTextIncludingWhitespaceAndMultipleLanguages() {
    for (String text : new String[] {"문항을 모두 마쳤어요, 결과 보기", " All done — 결과 보기\n", ""}) {
      JavaOnlyMap args = new JavaOnlyMap();
      args.putString("content", text);
      assertEquals(text, CompletionAnnouncementContent.from(args));
    }
  }

  @Test public void rejectsMissingOrNonStringContent() {
    assertNull(CompletionAnnouncementContent.from(null));
    JavaOnlyMap args = new JavaOnlyMap();
    assertNull(CompletionAnnouncementContent.from(args));
    args.putInt("content", 42);
    assertNull(CompletionAnnouncementContent.from(args));
  }
}
