package com.libitum.host;

import android.content.Context;
import android.content.SharedPreferences;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

public final class StorageModule extends LynxModule {
  private static final String AUTH_SESSION_KEY = "libitum.auth.session";
  private final SharedPreferences preferences;

  public StorageModule(Context context) {
    super(context);
    preferences = context.getSharedPreferences("duru-storage", Context.MODE_PRIVATE);
  }

  @LynxMethod public String get(String key) {
    return preferences.getString("libitum." + key, null);
  }

  @LynxMethod public void set(String key, String value) {
    SharedPreferences.Editor editor = preferences.edit().putString("libitum." + key, value);
    if (AUTH_SESSION_KEY.equals(key)) {
      // Keep login state durable even if the app process stops immediately afterward.
      editor.commit();
    } else {
      editor.apply();
    }
  }

  @LynxMethod public void remove(String key) {
    SharedPreferences.Editor editor = preferences.edit().remove("libitum." + key);
    if (AUTH_SESSION_KEY.equals(key)) {
      editor.commit();
    } else {
      editor.apply();
    }
  }
}
