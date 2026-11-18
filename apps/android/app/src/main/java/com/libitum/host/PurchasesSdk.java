package com.libitum.host;

import android.app.Application;
import com.lynx.tasm.LynxViewBuilder;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;

/**
 * RevenueCat SDK를 시작하는 유일한 자리다(ADR-0144 2단계). 키가 없으면 이 클래스의 어떤 코드도 SDK를 부르지 않고,
 * 구매 모듈도 등록하지 않는다 — JS의 다리는 꺼진 다리와 같고 요금제는 임시 추천 가격이다.
 * 앱 사용자 id는 로그인 뒤 JS가 `configure`(logIn)로 맞춘다 — 그 전에는 익명이다.
 */
final class PurchasesSdk {
  private static volatile boolean started = false;

  private PurchasesSdk() {}

  static void start(Application application, PurchasesConfig config) {
    if (config == null || started) return;
    try {
      Purchases.configure(new PurchasesConfiguration.Builder(application, config.apiKey()).build());
      started = true;
    } catch (RuntimeException | LinkageError ignored) {
      started = false;
    }
  }

  static boolean started() {
    return started;
  }

  static void configure(LynxViewBuilder builder, Object activity) {
    if (!started) return;
    builder.registerModule("PurchasesModule", PurchasesModule.class, activity);
  }
}
