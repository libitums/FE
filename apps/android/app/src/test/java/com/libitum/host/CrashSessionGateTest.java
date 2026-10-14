package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** RS1..RS5: the app-owned session clock that replaces the SDK's racy auto tracking (docs/adr/0061). */
public final class CrashSessionGateTest {
  @Test public void rs1_firstForegroundStartsOnce() {
    CrashSessionGate gate = new CrashSessionGate();
    assertTrue(gate.shouldStartOnForeground());
    assertFalse(gate.shouldStartOnForeground());
  }

  @Test public void rs2_shortBackgroundKeepsTheSession() {
    CrashSessionGate gate = new CrashSessionGate();
    gate.shouldStartOnForeground();
    gate.onBackground(1_000);
    assertFalse(gate.shouldEndAt(1_000 + CrashSessionGate.END_AFTER_MS - 1));
    assertFalse(gate.shouldStartOnForeground());
  }

  @Test public void rs3_longBackgroundEndsAndTheNextForegroundStartsAgain() {
    CrashSessionGate gate = new CrashSessionGate();
    gate.shouldStartOnForeground();
    gate.onBackground(1_000);
    assertTrue(gate.shouldEndAt(1_000 + CrashSessionGate.END_AFTER_MS));
    assertFalse(gate.shouldEndAt(1_000 + CrashSessionGate.END_AFTER_MS + 5));
    assertTrue(gate.shouldStartOnForeground());
  }

  @Test public void rs4_returningBeforeTheTimerCancelsThatEnd() {
    CrashSessionGate gate = new CrashSessionGate();
    gate.shouldStartOnForeground();
    gate.onBackground(1_000);
    gate.shouldStartOnForeground();
    assertFalse(gate.shouldEndAt(1_000 + CrashSessionGate.END_AFTER_MS));
    gate.onBackground(50_000);
    assertFalse(gate.shouldEndAt(1_000 + CrashSessionGate.END_AFTER_MS + 10_000));
    assertTrue(gate.shouldEndAt(50_000 + CrashSessionGate.END_AFTER_MS));
  }

  @Test public void rs5_noSessionMeansNothingToEnd() {
    CrashSessionGate gate = new CrashSessionGate();
    gate.onBackground(0);
    assertFalse(gate.shouldEndAt(CrashSessionGate.END_AFTER_MS * 2));
    assertEquals(30_000L, CrashSessionGate.END_AFTER_MS);
  }
}
