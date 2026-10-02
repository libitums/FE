package com.libitum.host;

/** Pure policy for Android's notification runtime permission and settings state. */
final class PushPermissionState {
  private PushPermissionState() {}

  static String name(int sdk, boolean granted, boolean enabled, boolean requested) {
    if (sdk < 33) return enabled ? "authorized" : "denied";
    if (granted) return enabled ? "authorized" : "denied";
    return requested ? "denied" : "not-determined";
  }
}
