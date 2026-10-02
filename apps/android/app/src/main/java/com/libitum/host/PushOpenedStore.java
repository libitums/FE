package com.libitum.host;

import android.content.Context;

/** One-shot handoff from the private notification tap Activity to the Lynx host. */
final class PushOpenedStore {
  private static final String NAME = "push-opened";
  private static final String TARGET = "target";

  static void store(Context context, String targetJson) {
    if (PushNotificationController.targetFromJson(targetJson) == null) return;
    context.getSharedPreferences(NAME, Context.MODE_PRIVATE).edit()
        .putString(TARGET, targetJson).commit();
  }

  static String take(Context context) {
    String target = context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
        .getString(TARGET, null);
    context.getSharedPreferences(NAME, Context.MODE_PRIVATE).edit().remove(TARGET).commit();
    return target;
  }
}
