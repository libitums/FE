package com.libitum.host;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONException;
import org.json.JSONObject;

/** Closed shape of a JS exception leaving the host: source, name, message and a capped stack. */
public final class CrashReportPayload {
  public enum Source {
    JS_BACKGROUND("js-background"),
    JS_MAIN_THREAD("js-main-thread");

    public final String tag;

    Source(String tag) { this.tag = tag; }
  }

  public static final int NAME_MAX = 80;
  public static final int MESSAGE_MAX = 300;
  public static final int STACK_MAX_LINES = 30;
  public static final int STACK_LINE_MAX = 400;
  // Pre-scrub caps: bound the work the scrub rules do and keep partial secrets out of their reach.
  public static final int TEXT_PRE_MAX = 65_536;
  public static final int MESSAGE_PRE_MAX = 2_000;
  public static final int STACK_LINE_PRE_MAX = 2_000;

  private static final Pattern NAME_AND_MESSAGE =
      Pattern.compile("^([A-Za-z_$][A-Za-z0-9_$]*(?: rejection)?): ([\\s\\S]*)$");
  private static final Pattern KNOWN_NAME =
      Pattern.compile("^(?:[A-Z][A-Za-z0-9]*(?:Error|Exception)|Error|unhandled rejection)$");
  private static final Pattern LINE_BREAK = Pattern.compile("\\r?\\n");
  // Main-thread errors arrive as "main-thread.js exception: TypeError: x " under a "backtrace:" line.
  private static final String MAIN_THREAD_PREFIX = "main-thread.js exception: ";
  private static final String BACKTRACE_HEADER = "backtrace:";

  public final Source source;
  public final String name;
  public final String message;
  public final List<String> stackLines;

  private CrashReportPayload(Source source, String name, String message, List<String> stackLines) {
    this.source = source;
    this.name = name;
    this.message = message;
    this.stackLines = Collections.unmodifiableList(stackLines);
  }

  /** Returns null for errors the host does not accept. Never throws. */
  public static CrashReportPayload fromLynxError(int code, String level, String text) {
    try {
      Source source = sourceOf(code);
      if (source == null || "warn".equals(level)) return null;
      if (text == null || text.trim().isEmpty()) return null;
      String body = (text.length() > TEXT_PRE_MAX ? text.substring(0, TEXT_PRE_MAX) : text).trim();
      String rawMessage;
      String rawStack;
      String[] raw = rawErrorOf(body);
      if (raw != null) {
        rawMessage = raw[0];
        rawStack = raw[1];
      } else {
        String[] lines = LINE_BREAK.split(body, 2);
        rawMessage = lines[0];
        rawStack = lines.length > 1 ? lines[1] : "";
      }
      rawMessage = preCapMessage(rawMessage);
      if (rawMessage.startsWith(MAIN_THREAD_PREFIX)) {
        rawMessage = rawMessage.substring(MAIN_THREAD_PREFIX.length()).trim();
      }
      String name = "Error";
      String message = rawMessage;
      Matcher split = NAME_AND_MESSAGE.matcher(rawMessage);
      if (split.matches() && KNOWN_NAME.matcher(split.group(1)).matches()) {
        name = split.group(1);
        message = split.group(2);
      }
      return new CrashReportPayload(
          source, cap(name, NAME_MAX), cap(CrashScrub.scrub(message), MESSAGE_MAX), stackOf(rawStack));
    } catch (RuntimeException | StackOverflowError error) {
      return null;
    }
  }

  /**
   * Cuts a message to MESSAGE_PRE_MAX. When it was cut, the trailing piece after the last
   * whitespace is dropped so a half token cannot slip past the scrub rules.
   */
  static String preCapMessage(String value) {
    if (value == null || value.length() <= MESSAGE_PRE_MAX) return value;
    String head = value.substring(0, MESSAGE_PRE_MAX);
    for (int i = head.length() - 1; i >= 0; i--) {
      if (Character.isWhitespace(head.charAt(i))) return head.substring(0, i);
    }
    return head;
  }

  /** Four elements: "lynx", source tag, name, first stack line (message when there is no stack). */
  public List<String> fingerprint() {
    return Arrays.asList("lynx", source.tag, name, stackLines.isEmpty() ? message : stackLines.get(0));
  }

  private static Source sourceOf(int code) {
    if (code >= 200 && code < 300) return Source.JS_BACKGROUND;
    if (code >= 1100 && code < 1200) return Source.JS_MAIN_THREAD;
    return null;
  }

  // {message, stack} from a JSON body with an object `rawError`; null when the text is not that shape.
  private static String[] rawErrorOf(String trimmed) {
    if (!trimmed.startsWith("{")) return null;
    try {
      JSONObject rawError = new JSONObject(trimmed).optJSONObject("rawError");
      if (rawError == null) return null;
      return new String[] {rawError.optString("message"), rawError.optString("stack")};
    } catch (JSONException error) {
      return null;
    }
  }

  private static List<String> stackOf(String rawStack) {
    List<String> lines = new ArrayList<>();
    for (String line : LINE_BREAK.split(rawStack)) {
      if (lines.size() >= STACK_MAX_LINES) break;
      if (line.trim().isEmpty()) continue;
      if (lines.isEmpty() && BACKTRACE_HEADER.equals(line.trim())) continue;
      String bounded = line.length() > STACK_LINE_PRE_MAX
          ? line.substring(line.length() - STACK_LINE_PRE_MAX) : line;
      String clean = CrashScrub.scrub(bounded);
      // Line and column sit at the end of a frame, so keep the tail.
      lines.add(clean.length() > STACK_LINE_MAX ? clean.substring(clean.length() - STACK_LINE_MAX) : clean);
    }
    return lines;
  }

  private static String cap(String value, int max) {
    return value.length() > max ? value.substring(0, max) : value;
  }
}
