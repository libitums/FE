package com.libitum.host;

import io.sentry.SentryEvent;

/** Builds and sanitizes Sentry events. Scaffold only. */
public final class CrashEventPolicy {
  private CrashEventPolicy() {}

  public static SentryEvent eventFrom(CrashReportPayload p) { return new SentryEvent(); }

  public static SentryEvent beforeSend(SentryEvent e) { return e; }
}
