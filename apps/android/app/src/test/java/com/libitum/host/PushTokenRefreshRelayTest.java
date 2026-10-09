package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class PushTokenRefreshRelayTest {
  private static final class CountingListener implements PushTokenRefreshRelay.Listener {
    int calls = 0;

    @Override public void onPushTokenRefreshed() {
      calls++;
    }
  }

  @Test public void tr1_notifyWithoutListenerReturnsFalseAndDoesNotThrow() {
    PushTokenRefreshRelay relay = new PushTokenRefreshRelay();
    assertFalse(relay.notifyRefreshed());
  }

  @Test public void tr2_attachedListenerIsNotifiedOncePerCall() {
    PushTokenRefreshRelay relay = new PushTokenRefreshRelay();
    CountingListener a = new CountingListener();
    relay.attach(a);
    assertTrue(relay.notifyRefreshed());
    assertEquals(1, a.calls);
    assertTrue(relay.notifyRefreshed());
    assertEquals(2, a.calls);
  }

  @Test public void tr3_detachedListenerIsNoLongerNotified() {
    PushTokenRefreshRelay relay = new PushTokenRefreshRelay();
    CountingListener a = new CountingListener();
    relay.attach(a);
    assertTrue(relay.notifyRefreshed());
    assertEquals(1, a.calls);
    relay.detach(a);
    assertFalse(relay.notifyRefreshed());
    assertEquals(1, a.calls);
  }

  @Test public void tr4_staleDetachDoesNotRemoveReplacementListener() {
    PushTokenRefreshRelay relay = new PushTokenRefreshRelay();
    CountingListener a = new CountingListener();
    CountingListener b = new CountingListener();
    relay.attach(a);
    relay.attach(b);
    relay.detach(a);
    assertTrue(relay.notifyRefreshed());
    assertEquals(1, b.calls);
    assertEquals(0, a.calls);
  }

  @Test public void tr5_attachReplacesPreviousListener() {
    PushTokenRefreshRelay relay = new PushTokenRefreshRelay();
    CountingListener a = new CountingListener();
    CountingListener b = new CountingListener();
    relay.attach(a);
    relay.attach(b);
    assertTrue(relay.notifyRefreshed());
    assertEquals(1, b.calls);
    assertEquals(0, a.calls);
  }

  @Test public void tr6_throwingListenerDoesNotPropagate() {
    PushTokenRefreshRelay relay = new PushTokenRefreshRelay();
    final int[] called = {0};
    relay.attach(new PushTokenRefreshRelay.Listener() {
      @Override public void onPushTokenRefreshed() {
        called[0]++;
        throw new RuntimeException("boom");
      }
    });
    assertTrue(relay.notifyRefreshed());
    assertEquals(1, called[0]);
  }
}
