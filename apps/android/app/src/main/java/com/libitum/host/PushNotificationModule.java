package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;

/** Four-method bridge shared with the iOS PushNotificationModule. */
public final class PushNotificationModule extends LynxModule {
  private final PushNotificationController controller;

  public PushNotificationModule(Context context, Object param) {
    super(context, param);
    controller = (PushNotificationController) param;
  }

  @LynxMethod public void getStatus(Callback callback) { controller.getStatus(callback); }
  @LynxMethod public void register(Callback callback) { controller.register(callback); }
  @LynxMethod public void takeOpened(Callback callback) { controller.takeOpened(callback); }
  @LynxMethod public void openSettings() { controller.openSettings(); }
}
