package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;

import org.junit.Test;

/** Shapes captured from a device run (docs/e2e/crash-reporting.md, stage A). */
public final class CrashReportPayloadObservedTest {
  private static final String TAIL =
      ",\"pid\":\"USER_ERROR\",\"url\":\"file://lynx_core.js\",\"dynamicComponentPath\":\"\"}";

  private static String body(String stack, String message) {
    return "{\"rawError\":{\"stack\":\"" + stack + "\",\"message\":\"" + message
        + "\",\"cause\":{\"cause\":\"\"}}" + TAIL;
  }

  private static final String MAIN_THREAD_STACK =
      "backtrace:\\n    at <anonymous> (main-thread.js:3465:13)\\n"
          + "    at profile (file:///worklet-runtime/main-thread.js:7073:36)\\n";

  @Test public void p10_backgroundRenderErrorKeepsNameMessageAndFirstFrame() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", body(
        "    at f$ (/.rspeedy/main/background.3f1544e0.js:7:310)\\n    at or (/lynx_core.js:1:1313)\\n",
        "Error: probe-render"));
    assertNotNull(p);
    assertEquals("Error", p.name);
    assertEquals("probe-render", p.message);
    assertEquals(2, p.stackLines.size());
    assertEquals("    at f$ (/.rspeedy/main/background.3f1544e0.js:7:310)", p.stackLines.get(0));
  }

  @Test public void p10_unhandledRejectionIsItsOwnName() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", body(
        "    at handleNext (/.rspeedy/main/background.js:23358:49)\\n",
        "unhandled rejection: probe-reject"));
    assertNotNull(p);
    assertEquals("unhandled rejection", p.name);
    assertEquals("probe-reject", p.message);
  }

  @Test public void p11_mainThreadPrefixIsDroppedBeforeTheNameSplit() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(1101, "error", body(
        MAIN_THREAD_STACK, "main-thread.js exception: TypeError: probe-main-thread "));
    assertNotNull(p);
    assertEquals(CrashReportPayload.Source.JS_MAIN_THREAD, p.source);
    assertEquals("TypeError", p.name);
    assertEquals("probe-main-thread", p.message);
  }

  @Test public void p12_backtraceHeaderIsNotAStackLine() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(1101, "error", body(
        MAIN_THREAD_STACK, "main-thread.js exception: Error: probe-main-thread "));
    assertNotNull(p);
    assertEquals(2, p.stackLines.size());
    assertEquals("    at <anonymous> (main-thread.js:3465:13)", p.stackLines.get(0));
    assertEquals("    at <anonymous> (main-thread.js:3465:13)", p.fingerprint().get(3));
  }

  @Test public void p12_differentMainThreadErrorsDoNotShareAFingerprint() {
    CrashReportPayload a = CrashReportPayload.fromLynxError(1101, "error", body(
        MAIN_THREAD_STACK, "main-thread.js exception: Error: a "));
    CrashReportPayload b = CrashReportPayload.fromLynxError(1101, "error", body(
        "backtrace:\\n    at <anonymous> (main-thread.js:9001:7)\\n",
        "main-thread.js exception: Error: b "));
    assertNotNull(a);
    assertNotNull(b);
    assertNotEquals(a.fingerprint(), b.fingerprint());
  }
}
