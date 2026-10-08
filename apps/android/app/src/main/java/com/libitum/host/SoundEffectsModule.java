package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

/** Android side of the iOS SoundEffectsModule contract: play(id) and stopRing(). */
public final class SoundEffectsModule extends LynxModule {
  private final SoundEffectsController effects;

  public SoundEffectsModule(Context context, Object param) {
    super(context, param);
    effects = (SoundEffectsController) param;
  }

  @LynxMethod public void play(String id) {
    effects.play(id);
  }

  @LynxMethod public void stopRing() {
    effects.stopRing();
  }
}
