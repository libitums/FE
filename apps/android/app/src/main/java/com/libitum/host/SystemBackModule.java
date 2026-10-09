package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

/** Bridges the JS back handler to MainActivity: ready() once the listener is set, respond() per press. */
public final class SystemBackModule extends LynxModule {
  private final MainActivity activity;

  public SystemBackModule(Context context, Object param) {
    super(context, param);
    activity = param instanceof MainActivity ? (MainActivity) param : null;
  }

  @LynxMethod public void ready() {
    if (activity != null) activity.onSystemBackReady();
  }

  @LynxMethod public void respond(String token, String outcome) {
    if (activity != null) activity.onSystemBackResponse(token, outcome);
  }
}
