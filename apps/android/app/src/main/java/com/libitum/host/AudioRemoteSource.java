package com.libitum.host;

import java.net.URI;
import java.net.URISyntaxException;

/** Accepts only absolute https URLs with a host; everything else stays on the bundled path. */
final class AudioRemoteSource {
  private AudioRemoteSource() {}

  /** Returns {@code source} itself when it is a remote https URL, otherwise {@code null}. */
  static String forSource(String source) {
    if (source == null || source.isEmpty()) return null;
    try {
      URI uri = new URI(source);
      String host = uri.getHost();
      if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || host.isEmpty()) return null;
      return source;
    } catch (URISyntaxException error) {
      return null;
    }
  }
}
