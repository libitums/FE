package com.libitum.host;

import android.app.Application;
import co.ab180.airbridge.Airbridge;
import co.ab180.airbridge.AirbridgeOption;
import co.ab180.airbridge.AirbridgeOptionBuilder;
import com.lynx.tasm.LynxViewBuilder;
import java.util.Map;

/**
 * Airbridge SDK의 유일한 접점(docs/adr/0063-airbridge-events.md). 설정이 유효할 때만 SDK를 손으로
 * 시작하고 모듈을 등록한다. 값이 없으면 SDK 호출 0 · 모듈 미등록이다. Airbridge에는 스스로 시작하는
 * 진입로가 없다 — initializeSDK를 부르지 않으면 시작하지 않는다.
 */
final class AirbridgeEvents {
  private static volatile boolean started;

  private AirbridgeEvents() {}

  static boolean start(Application app, AirbridgeEventsConfig config) {
    if (config == null) return false;
    try {
      // 딥링크는 범위 밖이다(ADR-0063). Android SDK에는 클립보드 옵션이 없다.
      AirbridgeOption option =
          new AirbridgeOptionBuilder(config.appName(), config.sdkToken())
              .setTrackMetaDeferredAppLinkEnabled(false)
              .build();
      Airbridge.initializeSDK(app, option);
      started = true;
      return true;
    } catch (RuntimeException | LinkageError ignored) {
      // 네이티브 라이브러리 · 클래스 로딩 실패(LinkageError)도 앱 시작을 막지 않는다.
      started = false;
      return false;
    }
  }

  static boolean started() {
    return started;
  }

  static void configure(LynxViewBuilder builder) {
    if (!started()) return;
    builder.registerModule("AirbridgeEventsModule", AirbridgeEventsModule.class);
  }

  static void track(String category, Map<String, String> attributes) {
    if (!started() || category == null || category.isEmpty()) return;
    try {
      if (attributes == null || attributes.isEmpty()) {
        Airbridge.trackEvent(category);
        return;
      }
      Airbridge.trackEvent(category, attributes);
    } catch (RuntimeException | LinkageError ignored) {
      // 측정 실패가 화면을 막지 않는다.
    }
  }
}
