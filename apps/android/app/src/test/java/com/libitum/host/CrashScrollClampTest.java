package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

/**
 * Android scroll-view clamps (UI method code 4) are not errors (Sentry DURU-ANDROID-G · Q · X).
 * The body shape is the one captured on a Pixel 8 emulator (assembleBundled, 2026-11-21).
 */
public final class CrashScrollClampTest {
  private static final String TAIL =
      ",\"pid\":\"USER_ERROR\",\"url\":\"file://lynx_core.js\",\"dynamicComponentPath\":\"\"}";
  private static final String STACK =
      "backtrace:\\n    at <anonymous> (file:///worklet-runtime/main-thread.js:10082:46)\\n"
          + "    at Promise (native)\\n"
          + "    at invoke (file:///worklet-runtime/main-thread.js:10084:12)\\n"
          + "    at _ (main-thread.js:6390:143)\\n";

  private static String body(String uiMethodResult) {
    String message = "main-thread.js exception: Error: UI method invoke: "
        + uiMethodResult.replace("\"", "\\\"") + " ";
    return "{\"rawError\":{\"stack\":\"" + STACK + "\",\"message\":\"" + message
        + "\",\"cause\":{\"cause\":\"\"}}" + TAIL;
  }

  private static String clamp(String target, String clamped) {
    return "{\"code\":4,\"data\":\"Target scroll position = " + target
        + " is beyond threshold. Clamped to position = " + clamped + "\"}";
  }

  private static final class RecordingSink implements CrashReporter.CrashSink {
    final List<CrashReportPayload> received = new ArrayList<>();

    @Override public void send(CrashReportPayload payload) {
      received.add(payload);
    }
  }

  @Test public void sc1_observedClampIsNotAccepted() {
    assertNull(CrashReportPayload.fromLynxError(1101, "error", body(clamp("0.0", "-2337.0"))));
  }

  @Test public void sc2_clampToAnyPositionIsNotAccepted() {
    assertNull(CrashReportPayload.fromLynxError(1101, "error", body(clamp("0.0", "-2244.0"))));
    assertNull(CrashReportPayload.fromLynxError(1101, "error", body(clamp("1000000.0", "5120.5"))));
    assertNull(CrashReportPayload.fromLynxError(201, "error", body(clamp("12.5", "0.0"))));
    assertNull(CrashReportPayload.fromLynxError(1101, "error", body(clamp("1.0E7", "8765.0"))));
    assertNull(CrashReportPayload.fromLynxError(1101, "error", body(clamp("1.0e+07", "1e7"))));
  }

  @Test public void sc3_otherCodeFourFailureIsStillAccepted() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(
        1101, "error", body("{\"code\":4,\"data\":\"node not found\"}"));
    assertNotNull(p);
    assertEquals("Error", p.name);
    assertTrue(p.message.startsWith("UI method invoke: {\"code\":4,"));
  }

  @Test public void sc4_clampTextUnderAnotherCodeIsStillAccepted() {
    String other = clamp("0.0", "-2244.0").replace("\"code\":4", "\"code\":5");
    assertNotNull(CrashReportPayload.fromLynxError(1101, "error", body(other)));
  }

  @Test public void sc5_clampTextOutsideAUiMethodResultIsStillAccepted() {
    String text = "TypeError: Target scroll position = 0.0 is beyond threshold. Clamped to position = -1.0";
    assertNotNull(CrashReportPayload.fromLynxError(1101, "error", text));
  }

  @Test public void sc5b_clampTextNamedErrorButNotAUiMethodResultIsStillAccepted() {
    String text = "main-thread.js exception: Error: Target scroll position = 0.0"
        + " is beyond threshold. Clamped to position = -1.0";
    assertNotNull(CrashReportPayload.fromLynxError(1101, "error", text));
  }

  @Test public void sc5c_clampUnderTheRejectionNameIsStillAccepted() {
    String text = "unhandled rejection: UI method invoke: " + clamp("0.0", "-2244.0");
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", text);
    assertNotNull(p);
    assertEquals("unhandled rejection", p.name);
  }

  @Test public void sc5d_clampWithTrailingTextIsStillAccepted() {
    String trailing = clamp("0.0", "-2244.0") + " extra";
    assertNotNull(CrashReportPayload.fromLynxError(1101, "error", body(trailing)));
    String inData = clamp("0.0", "-2244.0").replace("-2244.0\"", "-2244.0 more\"");
    assertNotNull(CrashReportPayload.fromLynxError(1101, "error", body(inData)));
  }

  @Test public void sc6_reporterRejectsClampWithoutSinkOrBudget() {
    RecordingSink sink = new RecordingSink();
    CrashReportBudget budget = new CrashReportBudget();
    CrashReporter reporter = new CrashReporter(sink, budget);
    for (int i = 0; i < 25; i++) {
      assertEquals(CrashReporter.Outcome.REJECTED,
          reporter.report(1101, "error", body(clamp("0.0", "-2244.0"))));
    }
    assertEquals(0, sink.received.size());
    assertEquals(CrashReporter.Outcome.SENT,
        reporter.report(1101, "error", body("{\"code\":4,\"data\":\"node not found\"}")));
    assertEquals(1, sink.received.size());
    for (int i = 2; i <= 20; i++) {
      assertTrue("budget left after the clamps, acquire " + i, budget.tryAcquire());
    }
  }
}
