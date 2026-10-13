package com.libitum.host;

import java.util.concurrent.atomic.AtomicInteger;

/** Caps JS exception reports per process so a render loop cannot flood the collector. */
public final class CrashReportBudget {
  public static final int MAX_PER_PROCESS = 20;

  private final AtomicInteger used = new AtomicInteger();

  public boolean tryAcquire() {
    while (true) {
      int current = used.get();
      if (current >= MAX_PER_PROCESS) return false;
      if (used.compareAndSet(current, current + 1)) return true;
    }
  }
}
