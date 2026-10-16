package com.libitum.host;

import java.util.Locale;
import java.util.regex.Pattern;

/** Pure checks on crash-reporting build settings (DSN, release, proguard UUID). */
public final class CrashReportConfig {
  private static final Pattern DSN = Pattern.compile("^https://[A-Za-z0-9]+@[A-Za-z0-9.-]+/[0-9]+$");
  private static final Pattern UUID_SHAPE =
      Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

  private CrashReportConfig() {}

  /** The trimmed DSN when it has the `https://<key>@<host>/<project>` shape, else null. */
  public static String dsnFrom(String raw) {
    if (raw == null) return null;
    String dsn = raw.trim();
    return DSN.matcher(dsn).matches() ? dsn : null;
  }

  public static String releaseOf(String applicationId, String versionName, int versionCode) {
    return applicationId + "@" + versionName + "+" + versionCode;
  }

  /** The lowercased UUID when raw has the 8-4-4-4-12 hex shape, else null. */
  public static String proguardUuidFrom(String raw) {
    if (raw == null || !UUID_SHAPE.matcher(raw).matches()) return null;
    return raw.toLowerCase(Locale.ROOT);
  }
}
