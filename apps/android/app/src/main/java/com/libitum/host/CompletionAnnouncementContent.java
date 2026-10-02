package com.libitum.host;

import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableType;

/** Extracts the completion text without changing its spoken wording. */
final class CompletionAnnouncementContent {
  private CompletionAnnouncementContent() {}

  static String from(ReadableMap args) {
    try {
      if (args != null && args.hasKey("content") && args.getType("content") == ReadableType.String) {
        return args.getString("content");
      }
    } catch (RuntimeException ignored) {
      // A malformed bridge value cannot become spoken content.
    }
    return null;
  }
}
