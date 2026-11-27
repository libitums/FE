package com.libitum.host;

import android.content.Context;
import com.google.android.gms.ads.MobileAds;
import com.lynx.tasm.LynxViewBuilder;

/**
 * Google Mobile Ads SDK를 시작하는 유일한 자리다(ADR-0209 D10). 앱 ID가 없으면(또는 release 빌드의 샘플 ID) 광고 모듈을 등록하지 않는다.
 * 등록해도 SDK는 서버가 광고 단위를 내려 첫 불러오기가 올 때 시작한다 — 쓰지 않을 SDK를 미리 띄우지 않는다.
 */
final class RewardedAdSdk {
  private static volatile RewardedAdConfig config = null;
  private static volatile boolean started = false;

  private RewardedAdSdk() {}

  static void configure(RewardedAdConfig next) {
    config = next;
  }

  static RewardedAdConfig config() {
    return config;
  }

  static synchronized void startIfNeeded(Context context) {
    if (config == null || started) return;
    MobileAds.initialize(context.getApplicationContext());
    started = true;
  }

  static void configure(LynxViewBuilder builder, Object activity) {
    if (config == null) return;
    builder.registerModule("RewardedAdModule", RewardedAdModule.class, activity);
  }
}
