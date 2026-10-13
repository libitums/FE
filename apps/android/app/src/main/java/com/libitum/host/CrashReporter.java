package com.libitum.host;

/** Funnel from Lynx errors to a sink; no Android dependency. Scaffold only. */
final class CrashReporter {
  interface CrashSink { void send(CrashReportPayload payload); }

  enum Outcome { REJECTED, DISABLED, OVER_BUDGET, SENT, FAILED }

  private final CrashSink sink;
  private final CrashReportBudget budget;

  CrashReporter(CrashSink sinkOrNull, CrashReportBudget budget) {
    this.sink = sinkOrNull;
    this.budget = budget;
  }

  Outcome report(int code, String level, String text) { return Outcome.REJECTED; }
}
