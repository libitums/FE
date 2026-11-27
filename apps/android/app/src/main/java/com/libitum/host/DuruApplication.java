package com.libitum.host;

import android.app.Application;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.lynx.service.http.LynxHttpService;
import com.lynx.service.image.LynxImageService;
import com.lynx.service.log.LynxLogService;
import com.lynx.tasm.LynxEnv;
import com.lynx.tasm.service.LynxServiceCenter;

public final class DuruApplication extends Application {
  @Override public void onCreate() {
    super.onCreate();
    CrashReporting.start(this);
    Fresco.initialize(this);
    LynxServiceCenter.inst().registerService(LynxImageService.getInstance());
    LynxServiceCenter.inst().registerService(LynxLogService.INSTANCE);
    LynxServiceCenter.inst().registerService(LynxHttpService.INSTANCE);
    LynxEnv.inst().init(this, null, null, null);
    DuruFirebaseMessagingService.createChannel(this);
    AirbridgeEvents.start(this, AirbridgeEventsConfig.from(BuildConfig.AIRBRIDGE_APP_NAME, BuildConfig.AIRBRIDGE_SDK_TOKEN));
    // RevenueCat 구매 SDK(ADR-0144 2단계). 키가 없으면 한 줄도 부르지 않는다.
    PurchasesSdk.start(this, PurchasesConfig.from(BuildConfig.REVENUECAT_API_KEY));
    // AdMob 보상형 광고(ADR-0209). 광고 단위가 없으면 한 줄도 부르지 않는다 — 광고 모듈도 등록하지 않는다.
    RewardedAdSdk.start(this,
        RewardedAdConfig.from(BuildConfig.ADMOB_APP_ID, BuildConfig.ADMOB_REWARDED_UNIT_ID));
    // RevenueCat → Airbridge 구매 이벤트가 기기 · 광고 클릭에 잇도록 Airbridge 기기 id를 건다(비동기, 두 SDK가 섰을 때만).
    PurchasesAttribution.linkAirbridgeDevice(this);
  }
}
