package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class ContentSyncSignalTest {
  private static final Object WIFI = new Object();
  private static final Object CELL = new Object();

  @Test public void skipsFirstReportWhenAlreadyConnectedAtRegistration() {
    ContentSyncSignal signal = new ContentSyncSignal(true);
    assertFalse(signal.onNetworkAvailable(WIFI));
  }

  @Test public void sendsWhenConnectionReturnsAfterLoss() {
    ContentSyncSignal signal = new ContentSyncSignal(true);
    signal.onNetworkAvailable(WIFI);
    signal.onNetworkLost(WIFI);
    assertTrue(signal.onNetworkAvailable(WIFI));
    assertFalse(signal.onNetworkAvailable(WIFI));
  }

  @Test public void sendsWhenFirstConnectionArrivesAfterOfflineStart() {
    ContentSyncSignal signal = new ContentSyncSignal(false);
    assertTrue(signal.onNetworkAvailable(WIFI));
  }

  @Test public void switchingDefaultNetworkIsNotAnOpportunity() {
    ContentSyncSignal signal = new ContentSyncSignal(true);
    signal.onNetworkAvailable(WIFI);
    assertFalse(signal.onNetworkAvailable(CELL));
    // 옛 네트워크의 onLost가 뒤늦게 와도 연결은 이어지고 있다.
    signal.onNetworkLost(WIFI);
    assertFalse(signal.onNetworkAvailable(CELL));
  }

  @Test public void lossOfCurrentNetworkThenSwitchSends() {
    ContentSyncSignal signal = new ContentSyncSignal(true);
    signal.onNetworkAvailable(WIFI);
    signal.onNetworkLost(WIFI);
    assertTrue(signal.onNetworkAvailable(CELL));
  }

  @Test public void onlyReturnsToForegroundSend() {
    ContentSyncSignal signal = new ContentSyncSignal(true);
    assertFalse(signal.onStart());
    assertTrue(signal.onStart());
    assertTrue(signal.onStart());
  }
}
