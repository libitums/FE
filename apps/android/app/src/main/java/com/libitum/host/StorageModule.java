package com.libitum.host;

import android.content.Context;
import android.content.SharedPreferences;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

public final class StorageModule extends LynxModule {
  private final SharedPreferences preferences;

  public StorageModule(Context context) {
    super(context);
    preferences = context.getSharedPreferences("duru-storage", Context.MODE_PRIVATE);
  }

  @LynxMethod public String get(String key) {
    return preferences.getString("libitum." + key, null);
  }

  @LynxMethod public void set(String key, String value) {
    preferences.edit().putString("libitum." + key, value).commit();
  }

  @LynxMethod public void remove(String key) {
    preferences.edit().remove("libitum." + key).commit();
  }
}
