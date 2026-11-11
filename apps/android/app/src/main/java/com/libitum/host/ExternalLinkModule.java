package com.libitum.host;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;

/**
 * 위기 안내의 전화 · 웹 주소를 시스템에 넘기는 호스트 모듈이다(ADR-0125). 전화는 다이얼 화면({@code ACTION_DIAL} — 권한 없음),
 * 웹은 브라우저({@code ACTION_VIEW}). 콜백 {@code { status: opened | rejected | failed }}.
 */
public final class ExternalLinkModule extends LynxModule {
  private final Activity activity;

  public ExternalLinkModule(Context context, Object param) {
    super(context, param);
    activity = param instanceof Activity ? (Activity) param : null;
  }

  @LynxMethod public void open(String url, Callback callback) {
    String target = ExternalLinkPolicy.target(url);
    if (target == null || activity == null) {
      reply(callback, "rejected");
      return;
    }
    Intent intent =
        new Intent(ExternalLinkPolicy.isTel(target) ? Intent.ACTION_DIAL : Intent.ACTION_VIEW, Uri.parse(target));
    activity.runOnUiThread(
        () -> {
          try {
            activity.startActivity(intent);
            reply(callback, "opened");
          } catch (ActivityNotFoundException | SecurityException unavailable) {
            reply(callback, "failed");
          }
        });
  }

  private static void reply(Callback callback, String status) {
    if (callback == null) return;
    JavaOnlyMap result = new JavaOnlyMap();
    result.putString("status", status);
    callback.invoke(result);
  }
}
