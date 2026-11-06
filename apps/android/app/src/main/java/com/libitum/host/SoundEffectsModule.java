package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

/** Android side of the iOS SoundEffectsModule contract: play(id), stopRing() and haptic(kind). */
public final class SoundEffectsModule extends LynxModule {
  private final SoundEffectsController effects;

  public SoundEffectsModule(Context context, Object param) {
    super(context, param);
    effects = param instanceof SoundEffectsController ? (SoundEffectsController) param : null;
  }

  @LynxMethod public void play(String id) {
    if (effects != null) effects.play(id);
  }

  @LynxMethod public void stopRing() {
    if (effects != null) effects.stopRing();
  }

  @LynxMethod public void haptic(String kind) {
    if (effects != null) effects.haptic(kind);
  }
}
