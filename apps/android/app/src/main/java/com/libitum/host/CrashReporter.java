package com.libitum.host;

/** Funnel from Lynx errors to a sink; no Android dependency. */
final class CrashReporter {
  interface CrashSink { void send(CrashReportPayload payload); }

  enum Outcome { REJECTED, DISABLED, OVER_BUDGET, SENT, FAILED }

  private final CrashSink sink;
  private final CrashReportBudget budget;

  CrashReporter(CrashSink sinkOrNull, CrashReportBudget budget) {
    this.sink = sinkOrNull;
    this.budget = budget;
  }

  /** Never throws. REJECTED and DISABLED spend no budget. */
  Outcome report(int code, String level, String text) {
    try {
      CrashReportPayload payload = CrashReportPayload.fromLynxError(code, level, text);
      if (payload == null) return Outcome.REJECTED;
      if (sink == null) return Outcome.DISABLED;
      if (!budget.tryAcquire()) return Outcome.OVER_BUDGET;
      sink.send(payload);
      return Outcome.SENT;
    } catch (RuntimeException error) {
      return Outcome.FAILED;
    }
  }
}
