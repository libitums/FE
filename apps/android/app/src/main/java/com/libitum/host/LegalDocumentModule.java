package com.libitum.host;

import android.app.Activity;
import android.content.Context;
import android.net.Uri;
import androidx.browser.customtabs.CustomTabsIntent;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableMap;

/** Opens only the two legal documents fixed in the Android host. */
public final class LegalDocumentModule extends LynxModule {
  private final Activity activity;

  public LegalDocumentModule(Context context, Object param) {
    super(context, param);
    activity = param instanceof Activity ? (Activity) param : null;
  }

  @LynxMethod public void open(ReadableMap args, Callback callback) {
    String document = null;
    try {
      if (args != null) document = args.getString("document");
    } catch (RuntimeException ignored) {
      // Unknown or malformed values cannot choose an external URL.
    }
    String url = LegalDocumentUrls.forName(document);
    if (url == null) {
      callback.invoke(payload("invalid-arguments"));
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
      boolean launched;
      try {
        new CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(activity, Uri.parse(url));
        launched = true;
      } catch (RuntimeException error) {
        launched = false;
      }
      callback.invoke(payload(launched ? "opened" : "failed"));
    });
  }

  static JavaOnlyMap payload(String status) {
    JavaOnlyMap result = new JavaOnlyMap();
    result.putString("status", status);
    return result;
  }
}
