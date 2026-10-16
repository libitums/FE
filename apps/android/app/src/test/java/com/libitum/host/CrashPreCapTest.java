package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import io.sentry.SentryEvent;
import io.sentry.protocol.Message;
import io.sentry.protocol.SentryException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Random;
import org.junit.Test;

/**
 * RV3: a pre-scrub size cap keeps scrubbing fast on huge input and leaves no partial secret. The
 * time cases carry a 60s timeout so a hang fails the case instead of stalling the suite; the
 * contract itself is 2 seconds.
 */
public final class CrashPreCapTest {
  private static final long LIMIT_MS = 2_000;
  private static final String ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  private static String chunk(int n) {
    Random r = new Random(42);
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) sb.append(ALNUM.charAt(r.nextInt(ALNUM.length())));
    return sb.toString();
  }

  private static boolean containsWindow(String haystack, String source) {
    if (haystack == null) return false;
    for (int i = 0; i + 40 <= source.length(); i += 7) {
      if (haystack.contains(source.substring(i, i + 40))) return true;
    }
    return false;
  }

  @Test(timeout = 60_000) public void rv3a_hugeUndelimitedMessageIsFastAndGone() {
    String blob = chunk(50_000);
    long t0 = System.nanoTime();
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", blob);
    long ms = (System.nanoTime() - t0) / 1_000_000;
    assertNotNull(p);
    assertTrue("took " + ms + "ms", ms < LIMIT_MS);
    assertFalse("blob fragment survived", containsWindow(p.message, blob));
  }

  @Test(timeout = 60_000) public void rv3b_hugeStackLineIsFastGoneAndKeepsItsTail() {
    String blob = chunk(50_000);
    String text = "Error: m\n    at f (" + blob + ":12:34)";
    long t0 = System.nanoTime();
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", text);
    long ms = (System.nanoTime() - t0) / 1_000_000;
    assertNotNull(p);
    assertTrue("took " + ms + "ms", ms < LIMIT_MS);
    assertEquals(1, p.stackLines.size());
    String line = p.stackLines.get(0);
    assertFalse("blob fragment survived", containsWindow(line, blob));
    assertTrue("tail lost: " + line, line.endsWith(":12:34)"));
  }

  @Test(timeout = 60_000) public void rv3c_emailCutByThePreCapLeavesNoFragment() {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < 19; i++) {
      for (int j = 0; j < 100; j++) sb.append('x');
      sb.append(' ');
    }
    while (sb.length() < 1989) sb.append("a ");
    assertEquals(1989, sb.length());
    sb.append("kimsehyun@example.com tail");
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", sb.toString());
    assertNotNull(p);
    assertFalse("@ survived: " + p.message, p.message.contains("@"));
    assertFalse("local part fragment survived: " + p.message, p.message.contains("kims"));
  }

  @Test(timeout = 60_000) public void rv3d_beforeSendFormattedMessageIsFastAndGone() {
    String blob = chunk(50_000);
    SentryException ex = new SentryException();
    ex.setType("IllegalStateException");
    ex.setValue("x");
    SentryEvent event = new SentryEvent();
    event.setExceptions(new ArrayList<>(Arrays.asList(ex)));
    Message message = new Message();
    message.setFormatted(blob);
    event.setMessage(message);
    long t0 = System.nanoTime();
    SentryEvent result = CrashEventPolicy.beforeSend(event);
    long ms = (System.nanoTime() - t0) / 1_000_000;
    assertTrue("took " + ms + "ms", ms < LIMIT_MS);
    if (result != null && result.getMessage() != null) {
      assertFalse("blob fragment survived", containsWindow(result.getMessage().getFormatted(), blob));
      assertFalse(containsWindow(result.getMessage().getMessage(), blob));
    }
  }

  @Test(timeout = 60_000) public void rv3e_textBeyondTheTotalCapDoesNotThrow() {
    StringBuilder plain = new StringBuilder("Error: m\n");
    for (int i = 0; i < 20_000; i++) plain.append("    at a (f:1:2)\n");
    String json =
        "{\"rawError\":{\"message\":\"TypeError: x\",\"stack\":\"" + chunk(120_000) + "\"}}";
    for (String text : new String[] {plain.toString(), json}) {
      CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", text);
      if (p != null) {
        assertFalse(p.name.isEmpty());
        assertTrue(p.stackLines.size() <= 30);
      }
    }
  }
}
