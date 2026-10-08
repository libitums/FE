package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public final class SystemBackGateTest {
  private static SystemBackGate readyGate() {
    SystemBackGate gate = new SystemBackGate();
    gate.markReady();
    return gate;
  }

  /** Presses once on a ready gate and returns the pending token. */
  private static String dispatch(SystemBackGate gate) {
    assertEquals(SystemBackGate.Press.DISPATCH, gate.press());
    String token = gate.pendingToken();
    assertNotNull(token);
    return token;
  }

  @Test public void sg1_pressBeforeReadyFinishesWithoutPending() {
    SystemBackGate gate = new SystemBackGate();
    assertEquals(SystemBackGate.Press.FINISH, gate.press());
    assertNull(gate.pendingToken());
  }

  @Test public void sg2_pressAfterReadyDispatchesWithFreshToken() {
    SystemBackGate gate = readyGate();
    assertEquals(SystemBackGate.Press.DISPATCH, gate.press());
    String token = gate.pendingToken();
    assertNotNull(token);
    assertNotEquals("", token);
  }

  @Test public void sg3_pressWhilePendingIsIgnoredAndKeepsToken() {
    SystemBackGate gate = readyGate();
    String token = dispatch(gate);
    assertEquals(SystemBackGate.Press.IGNORE, gate.press());
    assertEquals(token, gate.pendingToken());
  }

  @Test public void sg4_handledClearsPendingAndNextPressGetsNewToken() {
    SystemBackGate gate = readyGate();
    String first = dispatch(gate);
    assertEquals(SystemBackGate.Resolution.NONE, gate.respond(first, "handled"));
    assertNull(gate.pendingToken());
    String second = dispatch(gate);
    assertNotEquals(first, second);
  }

  @Test public void sg5_leaveMovesToBackAndClearsPending() {
    SystemBackGate gate = readyGate();
    String token = dispatch(gate);
    assertEquals(SystemBackGate.Resolution.MOVE_TO_BACK, gate.respond(token, "leave"));
    assertNull(gate.pendingToken());
  }

  @Test public void sg6_timeoutMovesToBackAndLateRespondIsNone() {
    SystemBackGate gate = readyGate();
    String token = dispatch(gate);
    assertEquals(SystemBackGate.Resolution.MOVE_TO_BACK, gate.timeout(token));
    assertNull(gate.pendingToken());
    assertEquals(SystemBackGate.Resolution.NONE, gate.respond(token, "leave"));
  }

  @Test public void sg7_timeoutAfterHandledIsNone() {
    SystemBackGate gate = readyGate();
    String token = dispatch(gate);
    assertEquals(SystemBackGate.Resolution.NONE, gate.respond(token, "handled"));
    assertEquals(SystemBackGate.Resolution.NONE, gate.timeout(token));
  }

  @Test public void sg8_otherTokenOrNoPendingRespondAndTimeoutAreNone() {
    SystemBackGate idle = readyGate();
    assertEquals(SystemBackGate.Resolution.NONE, idle.respond("1", "leave"));
    assertEquals(SystemBackGate.Resolution.NONE, idle.timeout("1"));
    assertNull(idle.pendingToken());

    SystemBackGate gate = readyGate();
    String token = dispatch(gate);
    String other = token + "-other";
    assertEquals(SystemBackGate.Resolution.NONE, gate.respond(other, "leave"));
    assertEquals(token, gate.pendingToken());
    assertEquals(SystemBackGate.Resolution.NONE, gate.timeout(other));
    assertEquals(token, gate.pendingToken());
  }

  @Test public void sg9_unknownOrNullOutcomeKeepsPendingUntilTimeout() {
    SystemBackGate gate = readyGate();
    String token = dispatch(gate);
    assertEquals(SystemBackGate.Resolution.NONE, gate.respond(token, "bogus"));
    assertEquals(token, gate.pendingToken());
    assertEquals(SystemBackGate.Resolution.NONE, gate.respond(token, null));
    assertEquals(token, gate.pendingToken());
    assertEquals(SystemBackGate.Resolution.MOVE_TO_BACK, gate.timeout(token));
  }

  @Test public void sg10_ackTimeoutIs500MsAndMarkReadyIsIdempotent() {
    assertEquals(500L, SystemBackGate.ACK_TIMEOUT_MS);
    SystemBackGate gate = new SystemBackGate();
    gate.markReady();
    gate.markReady();
    assertEquals(SystemBackGate.Press.DISPATCH, gate.press());
  }
}
