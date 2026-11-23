package com.libitum.host;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.speech.ModelDownloadListener;
import android.speech.RecognitionSupport;
import android.speech.RecognitionSupportCallback;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import java.util.concurrent.Executor;

/**
 * The on-device recognizer's model calls. Each API level's methods live in their own nested class so
 * the callers' bytecode never references a method or type the running platform does not have.
 */
final class SpeechModelSupport {
  static final String LOCALE = "ko-KR";

  interface PackCallback {
    void onPack(String koreanPack);
  }

  interface DownloadCallback {
    void onProgress(int percent);

    /** One of completed · scheduled · requested · failed, exactly once. */
    void onDone(String status, int errorCode);
  }

  private SpeechModelSupport() { }

  static Intent recognizerIntent() {
    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, LOCALE);
    intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
    return intent;
  }

  static boolean onDeviceAvailable(Context context) {
    return Build.VERSION.SDK_INT >= 31 && Api31Impl.isOnDeviceRecognitionAvailable(context);
  }

  static SpeechRecognizer createOnDevice(Context context) {
    return Api31Impl.createOnDeviceSpeechRecognizer(context);
  }

  /** API 33+. Answers once through {@code callback}; an error answers {@code unknown}. */
  static void checkKoreanPack(SpeechRecognizer recognizer, Executor executor, PackCallback callback) {
    Api33Impl.checkKoreanPack(recognizer, recognizerIntent(), executor, callback);
  }

  /** API 33+. API 34 reports progress and the outcome; API 33 can only hand the request over. */
  static void downloadKoreanPack(SpeechRecognizer recognizer, Executor executor,
      DownloadCallback callback) {
    if (Build.VERSION.SDK_INT >= 34) {
      Api34Impl.download(recognizer, recognizerIntent(), executor, callback);
    } else {
      Api33Impl.download(recognizer, recognizerIntent());
      callback.onDone("requested", 0);
    }
  }

  private static final class Api31Impl {
    static SpeechRecognizer createOnDeviceSpeechRecognizer(Context context) {
      return SpeechRecognizer.createOnDeviceSpeechRecognizer(context);
    }

    static boolean isOnDeviceRecognitionAvailable(Context context) {
      return SpeechRecognizer.isOnDeviceRecognitionAvailable(context);
    }
  }

  private static final class Api33Impl {
    static void checkKoreanPack(SpeechRecognizer recognizer, Intent intent, Executor executor,
        PackCallback callback) {
      recognizer.checkRecognitionSupport(intent, executor, new RecognitionSupportCallback() {
        @Override public void onSupportResult(RecognitionSupport support) {
          callback.onPack(SpeechRecognitionRoute.koreanPackOf(
              support.getInstalledOnDeviceLanguages(),
              support.getPendingOnDeviceLanguages(),
              support.getSupportedOnDeviceLanguages()));
        }

        @Override public void onError(int error) {
          callback.onPack(SpeechRecognitionRoute.PACK_UNKNOWN);
        }
      });
    }

    static void download(SpeechRecognizer recognizer, Intent intent) {
      recognizer.triggerModelDownload(intent);
    }
  }

  private static final class Api34Impl {
    static void download(SpeechRecognizer recognizer, Intent intent, Executor executor,
        DownloadCallback callback) {
      recognizer.triggerModelDownload(intent, executor, new ModelDownloadListener() {
        @Override public void onProgress(int completedPercent) {
          callback.onProgress(completedPercent);
        }

        @Override public void onSuccess() {
          callback.onDone("completed", 0);
        }

        @Override public void onScheduled() {
          callback.onDone("scheduled", 0);
        }

        @Override public void onError(int error) {
          callback.onDone("failed", error);
        }
      });
    }
  }
}
