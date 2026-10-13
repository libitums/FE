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

  private static final Pattern NAME_AND_MESSAGE =
      Pattern.compile("^([A-Za-z_$][A-Za-z0-9_$]*(?: rejection)?): ([\\s\\S]*)$");
  private static final Pattern LINE_BREAK = Pattern.compile("\\r?\\n");

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
      String rawMessage;
      String rawStack;
      String[] raw = rawErrorOf(text.trim());
      if (raw != null) {
        rawMessage = raw[0];
        rawStack = raw[1];
      } else {
        String[] lines = LINE_BREAK.split(text.trim(), 2);
        rawMessage = lines[0];
        rawStack = lines.length > 1 ? lines[1] : "";
      }
      String name = "Error";
      String message = rawMessage;
      Matcher split = NAME_AND_MESSAGE.matcher(rawMessage);
      if (split.matches()) {
        name = split.group(1);
        message = split.group(2);
      }
      return new CrashReportPayload(
          source, cap(name, NAME_MAX), cap(CrashScrub.scrub(message), MESSAGE_MAX), stackOf(rawStack));
    } catch (RuntimeException error) {
      return null;
    }
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
      String clean = CrashScrub.scrub(line);
      // Line and column sit at the end of a frame, so keep the tail.
      lines.add(clean.length() > STACK_LINE_MAX ? clean.substring(clean.length() - STACK_LINE_MAX) : clean);
    }
    return lines;
  }

  private static String cap(String value, int max) {
    return value.length() > max ? value.substring(0, max) : value;
  }
}
