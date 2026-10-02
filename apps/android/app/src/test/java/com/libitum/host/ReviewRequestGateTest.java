package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class ReviewRequestGateTest {
  @Test public void concurrentRequestsCollapseUntilCompletion() {
    ReviewRequestGate gate = new ReviewRequestGate();
    assertTrue(gate.begin());
    assertTrue(gate.isInFlight());
    assertFalse(gate.begin());
    gate.finish();
    assertFalse(gate.isInFlight());
    assertTrue(gate.begin());
  }

  @Test public void finishIsSafeWhenNoRequestStarted() {
    ReviewRequestGate gate = new ReviewRequestGate();
    gate.finish();
    assertFalse(gate.isInFlight());
    assertTrue(gate.begin());
  }
}
