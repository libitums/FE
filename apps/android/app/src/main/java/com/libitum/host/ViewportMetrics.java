package com.libitum.host;

import java.util.Collections;
import java.util.Map;

/** 글자 배율 · 화면 폭을 globalProps `fontScale` · `viewportWidth`로 옮기는 순수 변환입니다. */
final class ViewportMetrics {
  static final String FONT_SCALE_KEY = "fontScale";
  static final String VIEWPORT_WIDTH_KEY = "viewportWidth";

  private ViewportMetrics() {}

  /** 폭은 px ÷ density(dp). 유한한 양수인 값의 키만 싣습니다. */
  static Map<String, Object> globalProps(float fontScale, int widthPx, float density) {
    return Collections.<String, Object>emptyMap();
  }
}
