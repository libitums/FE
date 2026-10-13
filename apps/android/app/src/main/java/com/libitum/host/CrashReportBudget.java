package com.libitum.host;

import java.util.concurrent.atomic.AtomicInteger;

/** Caps JS exception reports per process. Scaffold only. */
public final class CrashReportBudget {
  public static final int MAX_PER_PROCESS = 20;

  private final AtomicInteger used = new AtomicInteger();

  public boolean tryAcquire() { return false; }
}
