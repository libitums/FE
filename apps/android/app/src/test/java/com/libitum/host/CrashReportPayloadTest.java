package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public final class CrashReportPayloadTest {
  private static final String PLAIN =
      "TypeError: x is undefined\n    at a (f:1:2)\n    at b (f:3:4)";

  private static CrashReportPayload make(int code, String text) {
    return CrashReportPayload.fromLynxError(code, "error", text);
  }

  private static String repeat(String s, int n) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) sb.append(s);
    return sb.toString();
  }

  @Test public void p1_backgroundRange() {
    for (int code : new int[] {201, 299}) {
      CrashReportPayload p = make(code, PLAIN);
      assertNotNull("code " + code, p);
      assertEquals(CrashReportPayload.Source.JS_BACKGROUND, p.source);
    }
  }

  @Test public void p1_mainThreadRange() {
    for (int code : new int[] {1101, 1199}) {
      CrashReportPayload p = make(code, PLAIN);
      assertNotNull("code " + code, p);
      assertEquals(CrashReportPayload.Source.JS_MAIN_THREAD, p.source);
    }
  }

  @Test public void p1_outsideRangeIsRejected() {
    int[] codes = {199, 300, 301, 1099, 1200, 0, -3};
    for (int code : codes) {
      assertNull("code " + code, make(code, PLAIN));
    }
  }

  @Test public void p2_warnLevelIsRejected() {
    assertNull(CrashReportPayload.fromLynxError(201, "warn", PLAIN));
  }

  @Test public void p2_errorAndNullLevelPass() {
    assertNotNull(CrashReportPayload.fromLynxError(201, "error", PLAIN));
    assertNotNull(CrashReportPayload.fromLynxError(201, null, PLAIN));
  }

  @Test public void p2_blankTextIsRejected() {
    assertNull(make(201, null));
    assertNull(make(201, ""));
    assertNull(make(201, "  \n "));
  }

  @Test public void p3_plainTextSplitsNameMessageAndStack() {
    CrashReportPayload p = make(201, PLAIN);
    assertNotNull(p);
    assertEquals("TypeError", p.name);
    assertEquals("x is undefined", p.message);
    assertEquals(2, p.stackLines.size());
  }

  @Test public void p4_jsonUsesRawErrorAndIgnoresOtherFields() {
    String json =
        "{\"rawError\":{\"message\":\"RangeError: bad\",\"stack\":\"    at a (f:1:2)\"},"
            + "\"other\":\"u@example.com\"}";
    CrashReportPayload p = make(201, json);
    assertNotNull(p);
    assertEquals("RangeError", p.name);
    assertEquals("bad", p.message);
    assertEquals(1, p.stackLines.size());
    String all = p.name + "|" + p.message + "|" + p.stackLines;
    assertFalse(all.contains("u@example.com"));
    assertFalse(all.contains("example"));
  }

  @Test public void p5_brokenJsonFallsBackToFirstLine() {
    CrashReportPayload p = make(201, "{broken json\n    at x (f:1:1)");
    assertNotNull(p);
    assertEquals("{broken json", p.message);
    assertEquals(1, p.stackLines.size());
  }

  @Test public void p5_jsonWithoutRawErrorFallsBackToFirstLine() {
    CrashReportPayload p = make(201, "{\"foo\":1}");
    assertNotNull(p);
    assertEquals("{\"foo\":1}", p.message);
    assertEquals("Error", p.name);
  }

  @Test public void p6_rejectionPrefixBecomesName() {
    CrashReportPayload p = make(201, "unhandled rejection: nope");
    assertNotNull(p);
    assertEquals("unhandled rejection", p.name);
    assertEquals("nope", p.message);
  }

  @Test public void p6_noPrefixUsesErrorName() {
    CrashReportPayload p = make(201, "nope");
    assertNotNull(p);
    assertEquals("Error", p.name);
    assertEquals("nope", p.message);
  }

  @Test public void p6_nonAsciiPrefixIsNotAName() {
    CrashReportPayload p = make(201, "한글: x");
    assertNotNull(p);
    assertEquals("Error", p.name);
  }

  @Test public void p7_scrubRunsBeforeTruncate() {
    CrashReportPayload p = make(201, repeat("a ", 147) + "me@example.com");
    assertNotNull(p);
    assertFalse("message must not keep a partial email", p.message.contains("@"));
    assertTrue(p.message.length() <= 300);
    assertTrue(p.message.length() > 290);
  }

  @Test public void p8_stackIsCappedAtThirtyLines() {
    StringBuilder sb = new StringBuilder("Error: m");
    for (int i = 0; i < 45; i++) sb.append("\n    at f").append(i).append(" (f:1:2)");
    CrashReportPayload p = make(201, sb.toString());
    assertNotNull(p);
    assertEquals(30, p.stackLines.size());
    assertTrue(p.stackLines.get(0).contains("f0 "));
  }

  @Test public void p8_longStackLineKeepsItsTail() {
    String line = repeat("ab ", 166) + "x:99";
    assertEquals(502, line.length());
    CrashReportPayload p = make(201, "Error: m\n" + line);
    assertNotNull(p);
    assertEquals(1, p.stackLines.size());
    assertEquals(line.substring(line.length() - 400), p.stackLines.get(0));
  }

  @Test public void p8_blankStackLinesDropAndCrlfSplits() {
    CrashReportPayload p = make(201, "Error: m\r\n    at a (f:1:2)\r\n   \r\n    at b (f:3:4)");
    assertNotNull(p);
    assertEquals(2, p.stackLines.size());
    for (String line : p.stackLines) assertFalse(line.contains("\r"));
  }

  @Test public void p8_nameIsCappedAtEighty() {
    CrashReportPayload p = make(201, repeat("A", 100) + ": msg");
    assertNotNull(p);
    assertEquals(80, p.name.length());
  }

  @Test public void p8_stackLinesAreUnmodifiable() {
    CrashReportPayload p = make(201, PLAIN);
    assertNotNull(p);
    try {
      p.stackLines.add("x");
      fail("stackLines must be unmodifiable");
    } catch (UnsupportedOperationException expected) {
      // expected
    }
  }

  @Test public void p9_fingerprintWithStackUsesFirstFrame() {
    CrashReportPayload p = make(201, PLAIN);
    assertNotNull(p);
    List<String> expected =
        Arrays.asList("lynx", "js-background", "TypeError", p.stackLines.get(0));
    assertEquals(expected, p.fingerprint());
  }

  @Test public void p9_fingerprintWithoutStackUsesMessage() {
    CrashReportPayload p = make(1101, "TypeError: x");
    assertNotNull(p);
    assertEquals(Arrays.asList("lynx", "js-main-thread", "TypeError", "x"), p.fingerprint());
  }
}
