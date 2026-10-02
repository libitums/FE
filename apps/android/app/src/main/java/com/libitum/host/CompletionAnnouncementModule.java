package com.libitum.host;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableType;

/** Requests the completion-only spoken announcement from Android accessibility. */
public final class CompletionAnnouncementModule extends LynxModule {
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final View hostView;

  public CompletionAnnouncementModule(Context context, Object param) {
    super(context, param);
    hostView = param instanceof View ? (View) param : null;
  }

  @LynxMethod public void announce(ReadableMap args, Callback callback) {
    String parsed = null;
    try {
      if (args != null && args.hasKey("content") && args.getType("content") == ReadableType.String) {
        parsed = CompletionAnnouncementContent.from(args.getString("content"));
      }
    } catch (RuntimeException ignored) {
      // A malformed bridge value cannot become spoken content.
    }
    if (parsed == null) {
      if (callback != null) callback.invoke((Object) null);
      return;
    }
    String content = parsed;
    mainHandler.post(() -> {
      if (hostView != null) hostView.announceForAccessibility(content);
      if (callback != null) callback.invoke((Object) null);
    });
  }
}
