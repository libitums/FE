package com.libitum.host;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import java.lang.ref.WeakReference;

/**
 * 보상형 광고를 불러오고 보여 주는 호스트 모듈이다(ADR-0208 · ADR-0017). **광고 단위 값이 있어 SDK가 시작된 빌드에서만** 등록한다.
 * <ul>
 *   <li>{@code loadRewarded(callback)} → {@code {status: loaded | no_fill | failed}}. 비개인화(npa=1)로 요청한다.
 *   <li>{@code showRewarded(userId, customData, callback)} → {@code {status: earned | dismissed | failed}}. 닫힌 뒤 한 번 답한다.
 *       SSV 옵션에 Supabase 사용자 id와 서버 요청 id를 싣는다 — 지급은 서버가 Google 콜백으로 판정한다.
 * </ul>
 */
public final class RewardedAdModule extends LynxModule {
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final WeakReference<Activity> activityRef;
  private RewardedAd ad;

  public RewardedAdModule(Context context, Object param) {
    super(context);
    this.activityRef = new WeakReference<>(param instanceof Activity ? (Activity) param : null);
  }

  @LynxMethod public void loadRewarded(Callback callback) {
    RewardedAdConfig config = RewardedAdSdk.config();
    Activity activity = activityRef.get();
    if (config == null || activity == null) {
      reply(callback, "failed");
      return;
    }
    mainHandler.post(() -> {
      try {
        Bundle extras = new Bundle();
        extras.putString("npa", "1");
        AdRequest request =
            new AdRequest.Builder().addNetworkExtrasBundle(AdMobAdapter.class, extras).build();
        RewardedAd.load(activity, config.unitId(), request, new RewardedAdLoadCallback() {
          @Override public void onAdLoaded(@NonNull RewardedAd loaded) {
            ad = loaded;
            reply(callback, "loaded");
          }

          @Override public void onAdFailedToLoad(@NonNull LoadAdError error) {
            ad = null;
            reply(callback, error.getCode() == AdRequest.ERROR_CODE_NO_FILL ? "no_fill" : "failed");
          }
        });
      } catch (RuntimeException error) {
        reply(callback, "failed");
      }
    });
  }

  @LynxMethod public void showRewarded(String userId, String customData, Callback callback) {
    mainHandler.post(() -> {
      Activity activity = activityRef.get();
      RewardedAd current = ad;
      if (current == null || activity == null || activity.isFinishing()) {
        reply(callback, "failed");
        return;
      }
      final boolean[] earned = {false};
      final boolean[] done = {false};
      try {
        current.setServerSideVerificationOptions(new ServerSideVerificationOptions.Builder()
            .setUserId(userId)
            .setCustomData(customData)
            .build());
        current.setFullScreenContentCallback(new FullScreenContentCallback() {
          @Override public void onAdDismissedFullScreenContent() {
            finish(earned[0] ? "earned" : "dismissed");
          }

          @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError error) {
            finish("failed");
          }

          private void finish(String status) {
            if (done[0]) return;
            done[0] = true;
            ad = null;
            reply(callback, status);
          }
        });
        current.show(activity, reward -> earned[0] = true);
      } catch (RuntimeException error) {
        ad = null;
        reply(callback, "failed");
      }
    });
  }

  private static void reply(Callback callback, String status) {
    JavaOnlyMap map = new JavaOnlyMap();
    map.putString("status", status);
    callback.invoke(map);
  }
}
