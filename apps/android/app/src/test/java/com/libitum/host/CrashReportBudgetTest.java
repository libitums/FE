package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;

public final class CrashReportBudgetTest {
  @Test public void b1_limitIsTwentyPerProcess() {
    assertEquals(20, CrashReportBudget.MAX_PER_PROCESS);
  }

  @Test public void b1_firstTwentyAcquiresSucceedThenFail() {
    CrashReportBudget budget = new CrashReportBudget();
    for (int i = 1; i <= 20; i++) {
      assertTrue("acquire " + i, budget.tryAcquire());
    }
    assertFalse(budget.tryAcquire());
    assertFalse(budget.tryAcquire());
  }

  @Test public void b2_concurrentAcquiresGrantExactlyTwenty() throws Exception {
    final CrashReportBudget budget = new CrashReportBudget();
    final AtomicInteger granted = new AtomicInteger();
    final CountDownLatch start = new CountDownLatch(1);
    Thread[] threads = new Thread[8];
    for (int t = 0; t < threads.length; t++) {
      threads[t] =
          new Thread(
              () -> {
                try {
                  start.await();
                } catch (InterruptedException e) {
                  return;
                }
                for (int i = 0; i < 10; i++) {
                  if (budget.tryAcquire()) granted.incrementAndGet();
                }
              });
      threads[t].start();
    }
    start.countDown();
    for (Thread thread : threads) thread.join();
    assertEquals(20, granted.get());
  }
}
