package com.libitum.host;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Strips personal-data patterns from crash text. The rule order is part of the contract. */
public final class CrashScrub {
  // `/data/app/~~<random>==/<package>-<random>==/` is fixed per install, so it ties crashes to one
  // device. Its random pieces are too short for the opaque-value rule, hence a rule of its own.
  private static final Pattern INSTALL_DIR =
      Pattern.compile("/data/app/(?:~~[A-Za-z0-9_=-]++/)?[A-Za-z0-9._]++-[A-Za-z0-9_=-]++/");
  private static final Pattern URL_QUERY = Pattern.compile("([A-Za-z][A-Za-z0-9+.-]*://[^\\s?#]+)[?#]\\S*");
  // Scheme-less query tail: possessive prefix keeps the scan linear.
  private static final Pattern BARE_QUERY = Pattern.compile("\\?[^\\s?#=]*+=\\S*");
  private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
  private static final Pattern DOTLESS_EMAIL = Pattern.compile("([^\\s@<>()\\[\\]]++)@([^\\s@<>()\\[\\]]+)");
  // `pkg.Class@1a2b3c` is a Java identity hash, not an address: a class-like name before a hex tail.
  private static final Pattern CLASS_NAME = Pattern.compile("(?:[A-Za-z_$][\\w$]*\\.)*[A-Z][\\w$]*");
  private static final Pattern HEX_TAIL = Pattern.compile("[0-9a-fA-F]{1,16}");
  private static final Pattern BEARER = Pattern.compile("\\b(bearer)\\s+\\S+", Pattern.CASE_INSENSITIVE);
  // `basic` is an ordinary word; the value after it counts only when it looks like base64 (a digit,
  // `+`, `/` or an upper-case letter somewhere), so header dumps in any quoting are covered.
  private static final Pattern BASIC =
      Pattern.compile("\\b([Bb][Aa][Ss][Ii][Cc])\\s+(?=[a-z]*[0-9+/A-Z])[A-Za-z0-9+/]{8,}+={0,2}");
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
      String out = withoutInstallPath(text);
      out = URL_QUERY.matcher(out).replaceAll("$1?[redacted]");
      out = BARE_QUERY.matcher(out).replaceAll("?[redacted]");
      out = EMAIL.matcher(out).replaceAll("[email]");
      out = dotlessEmails(out);
      out = BEARER.matcher(out).replaceAll("$1 [token]");
      out = BASIC.matcher(out).replaceAll("$1 [token]");
      out = JWT.matcher(out).replaceAll("[token]");
      out = OPAQUE.matcher(out).replaceAll("[token]");
      out = NUMBER.matcher(out).replaceAll("[number]");
      return NON_ASCII.matcher(out).replaceAll("[text]");
    } catch (RuntimeException | StackOverflowError error) {
      return "";
    }
  }

  /** Replaces the per-install directory with a fixed marker; leaves everything else as it is. */
  static String withoutInstallPath(String value) {
    return value == null ? null : INSTALL_DIR.matcher(value).replaceAll("/data/app/[install]/");
  }

  private static String dotlessEmails(String text) {
    Matcher m = DOTLESS_EMAIL.matcher(text);
    StringBuilder out = new StringBuilder();
    while (m.find()) {
      boolean identityHash =
          CLASS_NAME.matcher(m.group(1)).matches() && HEX_TAIL.matcher(m.group(2)).matches();
      m.appendReplacement(out, identityHash ? Matcher.quoteReplacement(m.group()) : "[email]");
    }
    m.appendTail(out);
    return out.toString();
  }
}
