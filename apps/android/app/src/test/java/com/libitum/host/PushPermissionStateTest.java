package com.libitum.host;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public final class PushPermissionStateTest {
  @Test public void api33SeparatesUnaskedDeniedAndAllowed() {
    assertEquals("not-determined", PushPermissionState.name(35, false, false, false));
    assertEquals("denied", PushPermissionState.name(35, false, false, true));
    assertEquals("denied", PushPermissionState.name(35, true, false, true));
    assertEquals("authorized", PushPermissionState.name(35, true, true, true));
  }

  @Test public void olderDevicesUseTheNotificationSetting() {
    assertEquals("authorized", PushPermissionState.name(32, true, true, false));
    assertEquals("denied", PushPermissionState.name(32, true, false, false));
  }
}
