package com.libitum.host;

import java.util.regex.Pattern;

/** Maps a content identifier to one bundled audio asset. */
final class AudioAssetPath {
  private static final Pattern SOURCE = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

  private AudioAssetPath() {}

  static String forSource(String source) {
    if (source == null || !SOURCE.matcher(source).matches()) return null;
    return "audio/" + source + ".m4a";
  }
}
