package com.libitum.host;

import java.util.HashMap;
import java.util.Map;

/** Window insets in pixels as the `safeAreaInsets` global prop, in Lynx layout units (dp). */
final class SafeAreaInsets {
  private SafeAreaInsets() {}

  static Map<String, Object> globalProps(int top, int bottom, int left, int right, float density) {
    Map<String, Object> insets = new HashMap<>();
    insets.put("top", edge(top, density));
    insets.put("bottom", edge(bottom, density));
    insets.put("left", edge(left, density));
    insets.put("right", edge(right, density));
    Map<String, Object> props = new HashMap<>();
    props.put("safeAreaInsets", insets);
    return props;
  }

  private static double edge(int pixels, float density) {
    if (pixels <= 0 || !(density > 0)) return 0;
    return pixels / (double) density;
  }
}
