package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import org.junit.Test;

/** RV4: the funnel swallows StackOverflowError (deeply nested JSON, throwing sink). */
public final class CrashStackOverflowTest {
  private static String deepJson(int depth) {
    StringBuilder sb = new StringBuilder("{\"rawError\":{\"message\":\"x\",\"stack\":\"\"");
    for (int i = 0; i < depth; i++) sb.append(",\"cause\":{\"message\":\"x\"");
    for (int i = 0; i < depth; i++) sb.append('}');
    sb.append("}}");
    return sb.toString();
  }

  @Test(timeout = 60_000) public void rv4_deeplyNestedJsonDoesNotThrowFromFromLynxError() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", deepJson(6_000));
    if (p != null) assertNotNull(p.name);
  }

  @Test(timeout = 60_000) public void rv4_deeplyNestedJsonDoesNotThrowFromReport() {
    CrashReporter reporter = new CrashReporter(payload -> {}, new CrashReportBudget());
    CrashReporter.Outcome outcome = reporter.report(201, "error", deepJson(6_000));
    assertNotNull(outcome);
  }

  @Test public void rv4_sinkThrowingStackOverflowIsFailedNotThrown() {
    CrashReporter reporter =
        new CrashReporter(
            payload -> {
              throw new StackOverflowError("boom");
            },
            new CrashReportBudget());
    assertEquals(
        CrashReporter.Outcome.FAILED,
        reporter.report(201, "error", "TypeError: x\n    at a (f:1:2)"));
  }
}
