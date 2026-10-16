package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public final class CrashReporterTest {
  private static final class RecordingSink implements CrashReporter.CrashSink {
    final List<CrashReportPayload> received = new ArrayList<>();

    @Override public void send(CrashReportPayload payload) {
      received.add(payload);
    }
  }

  private static final String TEXT = "TypeError: boom\n    at a (f:1:2)";

  @Test public void r1_unacceptedErrorIsRejectedWithoutSinkOrBudget() {
    RecordingSink sink = new RecordingSink();
    CrashReportBudget budget = new CrashReportBudget();
    CrashReporter reporter = new CrashReporter(sink, budget);
    assertEquals(CrashReporter.Outcome.REJECTED, reporter.report(301, "error", TEXT));
    assertEquals(0, sink.received.size());
    for (int i = 1; i <= 20; i++) {
      assertTrue("budget untouched, acquire " + i, budget.tryAcquire());
    }
  }

  @Test public void r2_nullSinkIsDisabledAndSpendsNoBudget() {
    CrashReportBudget budget = new CrashReportBudget();
    CrashReporter disabled = new CrashReporter(null, budget);
    for (int i = 0; i < 25; i++) {
      assertEquals(CrashReporter.Outcome.DISABLED, disabled.report(201, "error", TEXT));
    }
    RecordingSink sink = new RecordingSink();
    CrashReporter live = new CrashReporter(sink, budget);
    for (int i = 0; i < 20; i++) {
      assertEquals(CrashReporter.Outcome.SENT, live.report(201, "error", TEXT));
    }
    assertEquals(20, sink.received.size());
  }

  @Test public void r3_acceptedErrorIsSentOnceWithMatchingPayload() {
    RecordingSink sink = new RecordingSink();
    CrashReporter reporter = new CrashReporter(sink, new CrashReportBudget());
    assertEquals(CrashReporter.Outcome.SENT, reporter.report(1101, "error", TEXT));
    assertEquals(1, sink.received.size());
    CrashReportPayload payload = sink.received.get(0);
    assertNotNull(payload);
    assertEquals(CrashReportPayload.Source.JS_MAIN_THREAD, payload.source);
    assertEquals("TypeError", payload.name);
  }

  @Test public void r4_twentyFirstReportIsOverBudget() {
    RecordingSink sink = new RecordingSink();
    CrashReporter reporter = new CrashReporter(sink, new CrashReportBudget());
    for (int i = 1; i <= 20; i++) {
      assertEquals("report " + i, CrashReporter.Outcome.SENT, reporter.report(201, "error", TEXT));
    }
    assertEquals(CrashReporter.Outcome.OVER_BUDGET, reporter.report(201, "error", TEXT));
    assertEquals(20, sink.received.size());
  }

  @Test public void r5_throwingSinkIsSwallowedAsFailed() {
    CrashReporter reporter =
        new CrashReporter(
            payload -> {
              throw new RuntimeException("sink down");
            },
            new CrashReportBudget());
    assertEquals(CrashReporter.Outcome.FAILED, reporter.report(201, "error", TEXT));
  }
}
