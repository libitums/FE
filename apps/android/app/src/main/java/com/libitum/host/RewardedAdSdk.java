package com.libitum.host;

import android.app.Application;
import com.google.android.gms.ads.MobileAds;
import com.lynx.tasm.LynxViewBuilder;

/**
 * Google Mobile Ads SDK를 시작하는 유일한 자리다(ADR-0209). 광고 단위가 없으면 이 클래스의 어떤 코드도 SDK를 부르지 않고 광고 모듈도
 * 등록하지 않는다.
 */
final class RewardedAdSdk {
  private static volatile RewardedAdConfig config = null;

  private RewardedAdSdk() {}

  static void start(Application application, RewardedAdConfig next) {
    if (next == null || config != null) return;
    try {
      MobileAds.initialize(application);
      config = next;
    } catch (RuntimeException | LinkageError ignored) {
      config = null;
    }
  }

  static RewardedAdConfig config() {
    return config;
  }

  static void configure(LynxViewBuilder builder, Object activity) {
    if (config == null) return;
    builder.registerModule("RewardedAdModule", RewardedAdModule.class, activity);
  }
}
