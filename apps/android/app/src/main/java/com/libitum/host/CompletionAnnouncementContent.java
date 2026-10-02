package com.libitum.host;

/** Extracts the completion text without changing its spoken wording. */
final class CompletionAnnouncementContent {
  private CompletionAnnouncementContent() {}

  static String from(Object value) {
    return value instanceof String ? (String) value : null;
  }
}
