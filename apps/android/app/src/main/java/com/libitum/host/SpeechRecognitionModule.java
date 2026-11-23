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

  /** Opens this app's system settings page, where the microphone permission lives. */
  @LynxMethod public void openSettings() { recognition.openSettings(); }

  /** Answers {@code { koreanPack }} for the on-device ko-KR model (ADR-0017, 2026-11-19). */
  @LynxMethod public void getKoreanPack(Callback callback) { recognition.getKoreanPack(callback); }

  /**
   * Hands the ko-KR model download to the system once the learner agreed; answers {@code { status,
   * errorCode }} once and sends progress as the global event {@code speechKoreanPackProgress}.
   */
  @LynxMethod public void downloadKoreanPack(Callback callback) {
    recognition.downloadKoreanPack(callback);
  }
}
