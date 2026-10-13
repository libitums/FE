package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Second review round (docs/adr/0058, correction record): cut heads, over-scrubbing, name order. */
public final class CrashReviewRoundTwoTest {
  private static String repeat(String s, int n) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) sb.append(s);
    return sb.toString();
  }

  @Test public void rw6_stackLinePreCapIsEightHundred() {
    assertEquals(800, CrashReportPayload.STACK_LINE_PRE_MAX);
  }

  @Test public void rw7_cutStackLineDropsTheHalfTokenAtItsHead() {
    // The front cut lands inside the phone number; its tail must not survive as a short digit run.
    String line = "    at f (tel/01012345678/" + repeat("C", CrashReportPayload.STACK_LINE_PRE_MAX - 11) + ":1:2)";
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", "Error: x\n" + line);
    assertNotNull(p);
    assertEquals(1, p.stackLines.size());
    String out = p.stackLines.get(0);
    assertFalse(out, out.contains("45678"));
    assertTrue(out, out.endsWith(":1:2)"));
  }

  @Test public void rw7_uncutStackLineKeepsItsHead() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", "Error: x\n    at f (/a/b.js:1:2)");
    assertNotNull(p);
    assertEquals("    at f (/a/b.js:1:2)", p.stackLines.get(0));
  }

  @Test public void rw8_javaIdentityHashIsNotAnEmail() {
    String text = "token android.os.BinderProxy@4a5b6c7 is not valid";
    assertEquals(text, CrashScrub.scrub(text));
  }

  @Test public void rw8_plainWordBasicIsNotAnAuthHead() {
    String text = "the basic idea failed";
    assertEquals(text, CrashScrub.scrub(text));
  }

  @Test public void rw8_authHeadsAreStillRedacted() {
    assertEquals("Authorization: Basic [token]", CrashScrub.scrub("Authorization: Basic dXNlcjpwYXNz"));
    assertEquals("authorization basic [token]", CrashScrub.scrub("authorization basic dXNlcjpwYXNz"));
    assertEquals("Bearer [token] rejected", CrashScrub.scrub("Bearer abc.def-123 rejected"));
    assertEquals("[email] failed", CrashScrub.scrub("kim@localhost failed"));
  }

  @Test public void rs6_longMessageKeepsItsKnownName() {
    String chunk = repeat("ab.", 700);
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", "TypeError: " + chunk);
    assertNotNull(p);
    assertEquals("TypeError", p.name);
    assertTrue(p.message.length() <= CrashReportPayload.MESSAGE_MAX);
    assertFalse(p.message.isEmpty());
  }
}
