package com.libitum.host;

import java.util.Collections;
import java.util.Map;

/** 시스템 「동작 줄이기」 상태를 globalProps `reducedMotion`으로 옮기는 순수 변환입니다. */
final class ReducedMotion {
  static final String GLOBAL_PROPS_KEY = "reducedMotion";

  private ReducedMotion() {}

  /** 둘 중 하나라도 0f면 true. */
  static boolean fromScales(float animatorDurationScale, float transitionAnimationScale) {
    return false;
  }

  /** {"reducedMotion": enabled} 한 키짜리 맵. */
  static Map<String, Object> globalProps(boolean enabled) {
    return Collections.emptyMap();
  }
}
