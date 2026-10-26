package com.libitum.host;

import android.app.Application;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

  /** ADR-0085 D4: 시험 계정이라 추적을 멈췄는지 기억하는 자리. 다음 실행도 멈춘 채로 시작한다. */
  static final String PREFS_NAME = "airbridge_events";
  static final String TRACKING_STOPPED_KEY = "tracking_stopped";

  private static SharedPreferences prefs(Context context) {
    return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }

  static boolean start(Application app, AirbridgeEventsConfig config) {
    if (config == null) return false;
    try {
      // Meta 지연 앱 링크는 쓰지 않는다(ADR-0063 D5). Airbridge 딥링크 · 지연 딥링크는 ADR-0080.
      // 멈춰 둔 기기(시험 계정)에서는 설치 · 실행도 재지 않고 시작한다(ADR-0085 D4).
      AirbridgeOption option =
          new AirbridgeOptionBuilder(config.appName(), config.sdkToken())
              .setTrackMetaDeferredAppLinkEnabled(false)
              .setAutoStartTrackingEnabled(!prefs(app).getBoolean(TRACKING_STOPPED_KEY, false))
              .build();
      Airbridge.initializeSDK(app, option);
      started = true;
      handleDeferredDeeplink();
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

  /** ADR-0085 D4: 추적을 켜거나 멈추고 그 값을 기억한다. 시작되지 않은 빌드에서는 아무것도 하지 않는다. */
  static void setTrackingEnabled(Context context, boolean enabled) {
    if (!started()) return;
    try {
      prefs(context).edit().putBoolean(TRACKING_STOPPED_KEY, !enabled).apply();
      if (enabled) Airbridge.startTracking();
      else Airbridge.stopTracking();
    } catch (RuntimeException | LinkageError ignored) {
      // 측정 전환 실패가 화면을 막지 않는다.
    }
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

  // ------------------------------------------------------------------ 딥링크(ADR-0080)
  // 호스트는 링크를 해석하지 않고 한 개만 들고 있다가, JS가 앱 구간에서 takeOpenedDeeplink로 꺼낸다(알림 목적지와 같은 모양).

  /** 로그인 콜백(duru://auth-callback)은 웹 인증이 받는다 — 딥링크로 들고 있지 않는다. */
  static final String AUTH_CALLBACK_PREFIX = "duru://auth-callback";

  private static final Object deeplinkLock = new Object();
  private static String pendingDeeplink;
  private static volatile Runnable deeplinkListener;
  /** 처리한 Intent에 남기는 표시. 다시 선 Activity(글자 배율 변경 · 프로세스 복원)가 같은 링크를 두 번 열지 않는다. */
  static final String HANDLED_EXTRA = "libitum.duru.DEEPLINK_HANDLED";

  /** 우리 scheme(duru)이고 로그인 콜백이 아닐 때만 받는다. 순수. */
  static boolean isOwnDeeplink(String url) {
    if (url == null) return false;
    String lower = url.toLowerCase(java.util.Locale.ROOT);
    return lower.startsWith("duru://") && !lower.startsWith(AUTH_CALLBACK_PREFIX);
  }

  /** 링크가 들어오면 부를 것(MainActivity가 JS에 전역 이벤트를 보낸다). */
  static void setDeeplinkListener(Runnable listener) {
    deeplinkListener = listener;
  }

  /** MainActivity.onDestroy — 그 Activity가 건 것일 때만 푼다(다시 선 Activity가 먼저 건 것은 두고). */
  static void clearDeeplinkListener(Runnable listener) {
    synchronized (deeplinkLock) {
      if (deeplinkListener == listener) deeplinkListener = null;
    }
  }

  static boolean hasDeeplinkListener() {
    return deeplinkListener != null;
  }

  /** MainActivity.onResume — Airbridge 문서의 자리. 표시가 있는 Intent는 다시 처리하지 않는다. */
  static void handleDeeplink(Intent intent) {
    if (!started() || intent == null || intent.getData() == null) return;
    synchronized (deeplinkLock) {
      if (intent.getBooleanExtra(HANDLED_EXTRA, false)) return;
      intent.putExtra(HANDLED_EXTRA, true);
    }
    try {
      boolean isAirbridge =
          Airbridge.handleDeeplink(intent, uri -> storeDeeplink(uri == null ? null : uri.toString()));
      if (!isAirbridge) storeDeeplink(intent.getDataString());
    } catch (RuntimeException | LinkageError ignored) {
      // 딥링크 실패가 화면을 막지 않는다.
    }
  }

  /** 받아 둔 링크를 한 번 꺼낸다. 없으면 null. */
  static String takeDeeplink() {
    synchronized (deeplinkLock) {
      String url = pendingDeeplink;
      pendingDeeplink = null;
      return url;
    }
  }

  private static void handleDeferredDeeplink() {
    try {
      Airbridge.handleDeferredDeeplink(uri -> storeDeeplink(uri == null ? null : uri.toString()));
    } catch (RuntimeException | LinkageError ignored) {
      // 지연 딥링크 실패가 앱 시작을 막지 않는다.
    }
  }

  private static void storeDeeplink(String url) {
    if (!isOwnDeeplink(url)) return;
    synchronized (deeplinkLock) {
      pendingDeeplink = url;
    }
    Runnable listener = deeplinkListener;
    if (listener != null) listener.run();
  }
}
