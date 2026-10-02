package com.libitum.host;

public final class HostPathsTest {
  private static void equal(String expected, String actual) {
    if (!expected.equals(actual)) {
      throw new AssertionError("expected " + expected + " but was " + actual);
    }
  }

  public static void main(String[] args) {
    equal("http://10.0.2.2:3000/main.lynx.bundle", HostPaths.template(true, null));
    equal("http://192.168.1.2:3001/main.lynx.bundle",
        HostPaths.template(true, "http://192.168.1.2:3001/main.lynx.bundle"));
    equal("main.lynx.bundle", HostPaths.template(false, "http://example.com/app.bundle"));
    equal("asset:///static/image/cover.png", HostPaths.media("/static/image/cover.png", true));
    equal("http://10.0.2.2:3000/static/image/cover.png",
        HostPaths.media("/static/image/cover.png", false));
    equal("https://example.com:8443/static/image/cover.png",
        HostPaths.media("/static/image/cover.png", false,
            "https://example.com:8443/app/main.lynx.bundle"));
    equal("https://example.com/cover.png", HostPaths.media("https://example.com/cover.png", true));
  }
}
