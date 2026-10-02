package com.libitum.host;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.ReadableMap;

/** Requests the completion-only spoken announcement from Android accessibility. */
public final class CompletionAnnouncementModule extends LynxModule {
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final View hostView;

  public CompletionAnnouncementModule(Context context, Object param) {
    super(context, param);
    hostView = param instanceof View ? (View) param : null;
  }

  @LynxMethod public void announce(ReadableMap args, Callback callback) {
    String content = CompletionAnnouncementContent.from(args);
    if (content == null) {
      if (callback != null) callback.invoke((Object) null);
      return;
    }
    mainHandler.post(() -> {
      if (hostView != null) hostView.announceForAccessibility(content);
      if (callback != null) callback.invoke((Object) null);
    });
  }
}
