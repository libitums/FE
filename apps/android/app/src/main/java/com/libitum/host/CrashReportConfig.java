package com.libitum.host;

/** Pure checks on crash-reporting build settings (DSN, release, proguard UUID). Scaffold only. */
public final class CrashReportConfig {
  private CrashReportConfig() {}

  public static String dsnFrom(String raw) { return null; }

  public static String releaseOf(String applicationId, String versionName, int versionCode) { return ""; }

  public static String proguardUuidFrom(String raw) { return null; }
}
