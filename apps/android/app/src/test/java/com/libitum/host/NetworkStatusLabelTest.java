package com.libitum.host;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public final class NetworkStatusLabelTest {
  @Test public void offlineHasNoCost() {
    assertEquals("offline:unknown", NetworkStatusLabel.offline());
  }

  @Test public void wifiWithoutMeterIsUnmetered() {
    assertEquals("wifi:unmetered", NetworkStatusLabel.of(true, false, false, true, false));
  }

  @Test public void meteredWifiHotspotIsMetered() {
    assertEquals("wifi:metered", NetworkStatusLabel.of(true, false, false, false, false));
  }

  @Test public void cellularIsMetered() {
    assertEquals("cellular:metered", NetworkStatusLabel.of(false, true, false, false, false));
  }

  @Test public void dataSaverOnMeteredNetworkIsConstrained() {
    assertEquals("cellular:constrained", NetworkStatusLabel.of(false, true, false, false, true));
  }

  @Test public void dataSaverDoesNotApplyToUnmeteredNetwork() {
    assertEquals("wifi:unmetered", NetworkStatusLabel.of(true, false, false, true, true));
  }

  @Test public void ethernetIsReported() {
    assertEquals("ethernet:unmetered", NetworkStatusLabel.of(false, false, true, true, false));
  }

  @Test public void wifiWinsOverCellularWhenBothAppear() {
    assertEquals("wifi:unmetered", NetworkStatusLabel.of(true, true, false, true, false));
  }

  @Test public void otherTransportSuchAsVpnOnlyIsOther() {
    assertEquals("other:metered", NetworkStatusLabel.of(false, false, false, false, false));
  }

  @Test public void unknownIsTheFallback() {
    assertEquals("unknown:unknown", NetworkStatusLabel.UNKNOWN);
  }
}
