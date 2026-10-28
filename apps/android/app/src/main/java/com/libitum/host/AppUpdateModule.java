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

/** Opens this app's Google Play page (ADR-0086). The destination is fixed here; JS passes nothing. */
public final class AppUpdateModule extends LynxModule {
  private final Activity activity;

  public AppUpdateModule(Context context, Object param) {
    super(context, param);
    activity = param instanceof Activity ? (Activity) param : null;
  }

  @LynxMethod public void openStore(Callback callback) {
    String market = AppStoreUrls.market(BuildConfig.APPLICATION_ID);
    String web = AppStoreUrls.web(BuildConfig.APPLICATION_ID);
    if (market == null || web == null) {
      callback.invoke(payload("unconfigured"));
      return;
    }
    if (activity == null) {
      callback.invoke(payload("failed"));
      return;
    }
    activity.runOnUiThread(() -> {
      if (activity.isFinishing() || activity.isDestroyed()) {
        callback.invoke(payload("failed"));
        return;
      }
      callback.invoke(payload(launch(market) || launch(web) ? "opened" : "failed"));
    });
  }

  /** Play 앱(market://) → 없으면 브라우저(https://). 둘 다 못 열면 false. */
  private boolean launch(String url) {
    try {
      activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
      return true;
    } catch (ActivityNotFoundException missing) {
      return false;
    } catch (RuntimeException error) {
      return false;
    }
  }

  static JavaOnlyMap payload(String status) {
    JavaOnlyMap result = new JavaOnlyMap();
    result.putString("status", status);
    return result;
  }
}
