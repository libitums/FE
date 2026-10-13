package com.libitum.host;

import java.util.Collections;
import java.util.List;

/** Closed shape of a JS exception leaving the host. Scaffold only. */
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

  /** Returns null for errors the host does not accept. */
  public static CrashReportPayload fromLynxError(int code, String level, String text) { return null; }

  public List<String> fingerprint() { return Collections.emptyList(); }
}
