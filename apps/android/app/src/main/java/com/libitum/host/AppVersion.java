package com.libitum.host;

import java.util.HashMap;
import java.util.Map;

/**
 * 앱 버전을 globalProps `appVersion`으로 옮기는 순수 변환입니다(ADR-0086). 설정의 「Version 0.1.0 (6)」 줄과
 * 스플래시의 강제 업데이트 판정이 읽습니다(mobile `lib/app-version.ts`). `versionName`이 이름, `versionCode`가
 * 빌드 번호입니다 — 정책 파일의 `min_build.android`와 수로 비교합니다.
 */
final class AppVersion {
  static final String KEY = "appVersion";
  static final String PLATFORM = "android";

  private AppVersion() {}

  /** 이름이 비어 있지 않고 코드가 0 이상의 int 범위일 때만 키 하나를 싣습니다. 아니면 빈 맵(보내지 않음). */
  static Map<String, Object> globalProps(String name, long code) {
    Map<String, Object> props = new HashMap<>();
    if (name == null || name.isEmpty() || code < 0 || code > Integer.MAX_VALUE) return props;
    Map<String, Object> version = new HashMap<>();
    version.put("platform", PLATFORM);
    version.put("name", name);
    version.put("build", (int) code);
    props.put(KEY, version);
    return props;
  }
}
