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
  }
}
