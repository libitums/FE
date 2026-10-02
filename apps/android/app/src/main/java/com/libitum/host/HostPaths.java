package com.libitum.host;

import java.net.URI;

/** Pure host path policy shared by the Android entry point and media loader. */
public final class HostPaths {
  private HostPaths() {}

  public static String template(boolean debug, String override) {
    if (!debug) return "main.lynx.bundle";
    if (override != null && (override.startsWith("http://") || override.startsWith("https://"))) {
      return override;
    }
    return "http://10.0.2.2:3000/main.lynx.bundle";
  }

  public static String media(String url, boolean bundled) {
    return media(url, bundled, template(true, null));
  }

  public static String media(String url, boolean bundled, String templateUrl) {
    if (url == null || !url.startsWith("/static/")) return url;
    if (bundled) return "asset://" + url;
    try {
      URI template = URI.create(templateUrl);
      if (("http".equals(template.getScheme()) || "https".equals(template.getScheme()))
          && template.getRawAuthority() != null) {
        return template.getScheme() + "://" + template.getRawAuthority() + url;
      }
    } catch (IllegalArgumentException ignored) {
      // Keep the original URL when a caller supplies an invalid debug override.
    }
    return url;
  }
}
