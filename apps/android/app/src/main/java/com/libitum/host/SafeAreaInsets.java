package com.libitum.host;

import java.util.HashMap;
import java.util.Map;

/** Window insets in pixels as the `safeAreaInsets` global prop, in Lynx layout units (dp). */
final class SafeAreaInsets {
  private SafeAreaInsets() {}

  /** tappableBottom: WindowInsetsCompat.Type.tappableElement()의 아래 값(px). */
  static Map<String, Object> globalProps(
      int top, int bottom, int left, int right, int tappableBottom, float density) {
    Map<String, Object> insets = new HashMap<>();
    insets.put("top", edge(top, density));
    insets.put("bottom", edge(bottom, density));
    insets.put("left", edge(left, density));
    insets.put("right", edge(right, density));
    Map<String, Object> props = new HashMap<>();
    props.put("safeAreaInsets", insets);
    // 키보드 등이 섞일 수 있어 safe 아래 값을 넘지 않게 자른다.
    props.put("tappableBottomInset", edge(Math.min(tappableBottom, bottom), density));
    return props;
  }

  private static double edge(int pixels, float density) {
    if (pixels <= 0 || !(density > 0)) return 0;
    return pixels / (double) density;
  }
}
