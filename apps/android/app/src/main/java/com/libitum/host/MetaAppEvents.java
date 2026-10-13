package com.libitum.host;

import android.app.Application;
import android.os.Bundle;
import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.lynx.tasm.LynxViewBuilder;
import java.util.Map;

/**
 * Meta SDK의 유일한 접점. 설정이 유효할 때만 SDK를 손으로 초기화하고 모듈을 등록한다.
 * 값이 없으면 SDK 호출 0 · 모듈 미등록이다(FacebookInitProvider는 매니페스트에서 제거했다).
 */
final class MetaAppEvents {
  private static volatile AppEventsLogger logger;

  private MetaAppEvents() {}

  static boolean start(Application app, MetaAppEventsConfig config) {
    if (config == null) return false;
    try {
      FacebookSdk.setApplicationId(config.appId());
      FacebookSdk.setClientToken(config.clientToken());
      FacebookSdk.sdkInitialize(app);
      logger = AppEventsLogger.newLogger(app);
      return true;
    } catch (RuntimeException ignored) {
      logger = null;
      return false;
    }
  }

  static boolean started() {
    return logger != null;
  }

  static void configure(LynxViewBuilder builder) {
    if (!started()) return;
    builder.registerModule("MetaAppEventsModule", MetaAppEventsModule.class);
  }

  static void log(String name, Map<String, String> parameters) {
    AppEventsLogger current = logger;
    if (current == null || name == null || name.isEmpty()) return;
    try {
      if (parameters == null || parameters.isEmpty()) {
        current.logEvent(name);
        return;
      }
      Bundle bundle = new Bundle();
      for (Map.Entry<String, String> entry : parameters.entrySet()) {
        bundle.putString(entry.getKey(), entry.getValue());
      }
      current.logEvent(name, bundle);
    } catch (RuntimeException ignored) {
      // 측정 실패가 화면을 막지 않는다.
    }
  }
}
