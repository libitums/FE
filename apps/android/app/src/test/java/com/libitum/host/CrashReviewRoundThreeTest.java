package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import org.junit.Test;

/** Third review round (docs/adr/0058, correction record): Basic credentials in header dumps, dotless hosts. */
public final class CrashReviewRoundThreeTest {
  private static void gone(String input, String secret) {
    String out = CrashScrub.scrub(input);
    assertFalse(input + " -> " + out, out.contains(secret));
  }

  @Test public void rw10_basicCredentialInHeaderDumpsIsRedacted() {
    gone("{\"authorization\":\"Basic dXNlcjpwYXNz\"}", "dXNlcjpwYXNz");
    gone("\"Authorization\": \"Basic dXNlcjpwYXNz\"", "dXNlcjpwYXNz");
    gone("headers: authorization=Basic dXNlcjpwYXNz", "dXNlcjpwYXNz");
    gone("Basic dXNlcjpwYXNz", "dXNlcjpwYXNz");
    gone("auth failed\nBasic dXNlcjpwYXNz", "dXNlcjpwYXNz");
    gone("basic YWxhZGRpbjpvcGVuc2VzYW1l", "YWxhZGRpbjpvcGVuc2VzYW1l");
  }

  @Test public void rw10_ordinaryWordsAfterBasicStay() {
    for (String text : new String[] {
        "the basic idea failed", "basic implementation missing", "a basic check"}) {
      assertEquals(text, CrashScrub.scrub(text));
    }
  }

  @Test public void rs9_dotlessHostWithHexLookingTailIsAnAddress() {
    for (String text : new String[] {"user@abc123", "kim@cafe", "ops@c0ffee", "me@1a2b3c"}) {
      assertEquals(text, "[email]", CrashScrub.scrub(text));
    }
  }

  @Test public void rs9_javaIdentityHashStays() {
    for (String text : new String[] {
        "token android.os.BinderProxy@4a5b6c7 is not valid", "Foo@1f", "a.b.Outer$Inner@dead"}) {
      assertEquals(text, CrashScrub.scrub(text));
    }
  }
}
