package com.libitum.host;

import java.net.URI;
import java.net.URISyntaxException;

/** Validation shared by the Lynx entry point and both browser redirect paths. */
final class WebAuthContract {
  private WebAuthContract() {}

  static boolean validRequest(String url, String callbackScheme) {
    if (url == null || !"duru".equals(callbackScheme)) {
      return false;
    }
    try {
      URI uri = new URI(url);
      return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null;
    } catch (URISyntaxException error) {
      return false;
    }
  }

  static boolean expectedRedirect(String callbackUrl, String callbackScheme) {
    if (callbackUrl == null || callbackScheme == null) return false;
    try {
      URI uri = new URI(callbackUrl);
      return callbackScheme.equals(uri.getScheme())
          && "auth-callback".equals(uri.getHost())
          && uri.getPort() == -1
          && uri.getUserInfo() == null
          && (uri.getPath() == null || uri.getPath().isEmpty());
    } catch (URISyntaxException error) {
      return false;
    }
  }
}
