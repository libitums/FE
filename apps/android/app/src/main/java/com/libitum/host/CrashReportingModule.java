package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

/**
 * JS hands the crash reporter the signed-in user's internal id, and clears it on logout or account
 * deletion (docs/adr/0207). Without a DSN the id is kept and nothing is sent. Never throws.
 */
public final class CrashReportingModule extends LynxModule {
  public CrashReportingModule(Context context) {
    super(context);
  }

  @LynxMethod public void setUser(String userId) {
    try {
      CrashUser.set(userId);
    } catch (RuntimeException ignored) {
      // Reporting must never throw into the JS bridge.
    }
  }

  @LynxMethod public void clearUser() {
    CrashUser.clear();
  }
}
