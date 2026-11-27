package com.libitum.host;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The signed-in user that crash events carry: the internal id only, the same value PostHog uses as
 * its distinct id. No email, name or IP. JS sets it after login and clears it on logout or account
 * deletion (CrashReportingModule, docs/adr/0207). No Android or Sentry dependency.
 */
public final class CrashUser {
  private static final Pattern UUID_SHAPE =
      Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
  private static volatile String current;

  private CrashUser() {}

  /** The lowercased id when raw has the 8-4-4-4-12 hex shape, else null. */
  public static String idFrom(String raw) {
    if (raw == null) return null;
    String id = raw.trim().toLowerCase(Locale.ROOT);
    return UUID_SHAPE.matcher(id).matches() ? id : null;
  }

  /** Keeps a valid id. Anything else clears the previous one, so no stale user survives. */
  static boolean set(String raw) {
    String id = idFrom(raw);
    current = id;
    return id != null;
  }

  static void clear() {
    current = null;
  }

  static String current() {
    return current;
  }
}
