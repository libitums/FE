package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableType;

/** Lynx bridge for Android speech recognition. */
public final class SpeechRecognitionModule extends LynxModule {
  private final SpeechRecognitionController recognition;

  public SpeechRecognitionModule(Context context, Object param) {
    super(context, param);
    recognition = (SpeechRecognitionController) param;
  }

  @LynxMethod public void getStatus(Callback callback) {
    recognition.getStatus(callback);
  }

  @LynxMethod public void requestPermissions(Callback callback) {
    recognition.requestPermissions(callback);
  }

  @LynxMethod public void start(ReadableMap args, Callback callback) {
    boolean requireOnDevice = true;
    try {
      if (args == null) {
        recognition.invalidArguments(callback);
        return;
      }
      if (args.hasKey("requireOnDevice")) {
        if (args.getType("requireOnDevice") != ReadableType.Boolean) {
          recognition.invalidArguments(callback);
          return;
        }
        requireOnDevice = args.getBoolean("requireOnDevice");
      }
    } catch (RuntimeException error) {
      recognition.invalidArguments(callback);
      return;
    }
    recognition.start(requireOnDevice, callback);
  }

  @LynxMethod public void stop() { recognition.stop(); }
}
