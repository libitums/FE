package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;

/** The existing mobile audio bridge's Android implementation. */
public final class AudioPlaybackModule extends LynxModule {
  private final AudioPlaybackController playback;

  public AudioPlaybackModule(Context context, Object param) {
    super(context, param);
    playback = (AudioPlaybackController) param;
  }

  @LynxMethod public void play(String source, Callback done) {
    playback.play(source, done);
  }

  @LynxMethod public void stop() {
    playback.stop();
  }

  @LynxMethod public void pause() {
    playback.pause();
  }

  @LynxMethod public void resume() {
    playback.resume();
  }
}
