package com.libitum.host;

import java.util.regex.Pattern;

/** Strips personal-data patterns from crash text. The rule order is part of the contract. */
public final class CrashScrub {
  private static final Pattern URL_QUERY = Pattern.compile("([A-Za-z][A-Za-z0-9+.-]*://[^\\s?#]+)[?#]\\S*");
  // Scheme-less query tail: possessive prefix keeps the scan linear.
  private static final Pattern BARE_QUERY = Pattern.compile("\\?[^\\s?#=]*+=\\S*");
  private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
  // `Class@1a2b3c` is a Java identity hash, not an address, so a hex-only tail is left alone.
  private static final Pattern DOTLESS_EMAIL = Pattern.compile(
      "[^\\s@<>()\\[\\]]++@(?![0-9a-fA-F]{1,16}(?![A-Za-z0-9]))[^\\s@<>()\\[\\]]+");
  // `basic` alone is an ordinary word; it counts only behind an authorization head.
  private static final Pattern AUTH_HEAD =
      Pattern.compile("\\b(authorization:?\\s*basic|bearer)\\s+\\S+", Pattern.CASE_INSENSITIVE);
  private static final Pattern JWT =
      Pattern.compile("eyJ[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{5,}");
  private static final Pattern OPAQUE = Pattern.compile("[A-Za-z0-9_-]{32,}");
  private static final Pattern NUMBER = Pattern.compile("\\+?\\d(?:[ ().-]{0,2}\\d){8,}");
  private static final Pattern NON_ASCII = Pattern.compile("[^\\x00-\\x7F]+");

  private CrashScrub() {}

  /** Never throws; text the rules cannot process is dropped rather than passed through. */
  public static String scrub(String text) {
    if (text == null) return "";
    try {
      String out = URL_QUERY.matcher(text).replaceAll("$1?[redacted]");
      out = BARE_QUERY.matcher(out).replaceAll("?[redacted]");
      out = EMAIL.matcher(out).replaceAll("[email]");
      out = DOTLESS_EMAIL.matcher(out).replaceAll("[email]");
      out = AUTH_HEAD.matcher(out).replaceAll("$1 [token]");
      out = JWT.matcher(out).replaceAll("[token]");
      out = OPAQUE.matcher(out).replaceAll("[token]");
      out = NUMBER.matcher(out).replaceAll("[number]");
      return NON_ASCII.matcher(out).replaceAll("[text]");
    } catch (RuntimeException | StackOverflowError error) {
      return "";
    }
  }
}
