package com.libitum.host;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.ArrayList;
import java.util.List;

/** Owns microphone permission and one Android speech recognizer on the main thread. */
final class SpeechRecognitionController {
  private static final int MICROPHONE_REQUEST = 701;
  private static final long FINALIZE_TIMEOUT_MS = 3000;
  private static final String LOCALE = "ko-KR";
  private static final String ERROR_DOMAIN = "android.speech.SpeechRecognizer";
  private static final String PERMISSION_PREF = "microphone-requested";

  private final Activity activity;
  private final Handler main = new Handler(Looper.getMainLooper());
  private final List<Callback> pendingPermissions = new ArrayList<>();
  private Active active;

  private static final class Active {
    final SpeechRecognitionSession session;
    final SpeechRecognizer recognizer;
    final Callback callback;
    String text = "";
    boolean isFinal;
    boolean stopping;

    Active(SpeechRecognitionSession session, SpeechRecognizer recognizer, Callback callback) {
      this.session = session;
      this.recognizer = recognizer;
      this.callback = callback;
    }
  }

  SpeechRecognitionController(Activity activity) { this.activity = activity; }

  void getStatus(Callback callback) {
    main.post(() -> callback.invoke(statusPayload()));
  }

  void requestPermissions(Callback callback) {
    main.post(() -> {
      if (!pendingPermissions.isEmpty()) {
        pendingPermissions.add(callback);
        return;
      }
      if (!"not-determined".equals(microphoneState())) {
        callback.invoke(statusPayload());
        return;
      }
      pendingPermissions.add(callback);
      activity.getPreferences(Activity.MODE_PRIVATE).edit().putBoolean(PERMISSION_PREF, true).apply();
      try {
        activity.requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, MICROPHONE_REQUEST);
      } catch (RuntimeException error) {
        settlePermissions();
      }
    });
  }

  void onRequestPermissionsResult(int requestCode) {
    if (requestCode == MICROPHONE_REQUEST) settlePermissions();
  }

  void start(boolean requestedOnDevice, Callback callback) {
    main.post(() -> begin(requestedOnDevice, callback));
  }

  void invalidArguments(Callback callback) {
    main.post(() -> callback.invoke(resultPayload("invalid-arguments", null, 0, "")));
  }

  void stop() {
    main.post(() -> {
      Active current = active;
      if (current == null || current.stopping) return;
      current.stopping = true;
      try {
        current.recognizer.stopListening();
      } catch (RuntimeException error) {
        finish(current, "recognition-failed", SpeechRecognizer.ERROR_CLIENT, error.getMessage());
        return;
      }
      main.postDelayed(() -> {
        if (active == current) finish(current, "recognized", 0, "");
      }, FINALIZE_TIMEOUT_MS);
    });
  }

  void interrupt() {
    main.post(() -> {
      Active current = active;
      if (current != null) finish(current, "recognition-failed", SpeechRecognizer.ERROR_CLIENT,
          "Host left the foreground");
    });
  }

  void destroy() {
    main.post(() -> {
      Active current = active;
      if (current != null) finish(current, "recognition-failed", SpeechRecognizer.ERROR_CLIENT,
          "Host was destroyed");
      settlePermissions();
      main.removeCallbacksAndMessages(null);
    });
  }

  private void begin(boolean requestedOnDevice, Callback callback) {
    if (active != null) {
      callback.invoke(resultPayload("already-listening", null, 0, ""));
      return;
    }
    if (!"granted".equals(microphoneState())) {
      callback.invoke(resultPayload("permission-denied", null, 0, ""));
      return;
    }
    boolean supportsOnDevice = onDeviceAvailable();
    if (!recognizerAvailable() && !supportsOnDevice) {
      callback.invoke(resultPayload("recognizer-unavailable", null, 0, ""));
      return;
    }
    SpeechRecognitionSession session = new SpeechRecognitionSession(
        requestedOnDevice, supportsOnDevice, SystemClock.elapsedRealtime());
    SpeechRecognizer recognizer = null;
    try {
      // Match iOS: request on-device by default, but disclose an unavailable guarantee
      // in the result rather than silently claiming one for the platform recognizer.
      recognizer = session.requiresOnDevice()
          ? Api31Impl.createOnDeviceSpeechRecognizer(activity)
          : SpeechRecognizer.createSpeechRecognizer(activity);
      Active current = new Active(session, recognizer, callback);
      active = current;
      recognizer.setRecognitionListener(listener(current));
      Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
      intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
      intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, LOCALE);
      intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
      recognizer.startListening(intent);
    } catch (RuntimeException error) {
      String status = error instanceof SecurityException ? "permission-denied"
          : "recognizer-unavailable";
      if (active != null && active.session == session) {
        finish(active, status, SpeechRecognizer.ERROR_CLIENT, error.getMessage());
      } else {
        if (recognizer != null) {
          try { recognizer.destroy(); } catch (RuntimeException ignored) { }
        }
        callback.invoke(resultPayload(status, session, null,
            SpeechRecognizer.ERROR_CLIENT, error.getMessage()));
      }
    }
  }

  private RecognitionListener listener(Active current) {
    return new RecognitionListener() {
      @Override public void onReadyForSpeech(Bundle params) { }
      @Override public void onBeginningOfSpeech() { }
      @Override public void onRmsChanged(float rmsDb) {
        if (active == current) current.session.observeLevel(rmsDb);
      }
      @Override public void onBufferReceived(byte[] buffer) {
        if (active == current && buffer != null && buffer.length > 0) current.session.observeBuffer();
      }
      @Override public void onEndOfSpeech() { }
      @Override public void onError(int error) {
        if (active != current) return;
        String status = error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS
            ? "permission-denied" : error == SpeechRecognizer.ERROR_AUDIO
            ? "audio-failed" : error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY
            || error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED
            ? "recognizer-unavailable" : "recognition-failed";
        finish(current, status, error, "Recognition error " + error);
      }
      @Override public void onResults(Bundle results) {
        if (active != current) return;
        updateText(current, results);
        current.isFinal = true;
        finish(current, "recognized", 0, "");
      }
      @Override public void onPartialResults(Bundle partialResults) {
        if (active == current) updateText(current, partialResults);
      }
      @Override public void onEvent(int eventType, Bundle params) { }
    };
  }

  private static void updateText(Active current, Bundle results) {
    if (results == null) return;
    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
    if (matches != null && !matches.isEmpty() && matches.get(0) != null) {
      current.text = matches.get(0);
    }
  }

  private void finish(Active current, String status, int errorCode, String errorMessage) {
    if (active != current || !current.session.finish()) return;
    active = null;
    try { current.recognizer.cancel(); } catch (RuntimeException ignored) { }
    try { current.recognizer.destroy(); } catch (RuntimeException ignored) { }
    current.callback.invoke(resultPayload(status, current, errorCode, errorMessage));
  }

  private void settlePermissions() {
    if (pendingPermissions.isEmpty()) return;
    JavaOnlyMap payload = statusPayload();
    List<Callback> callbacks = new ArrayList<>(pendingPermissions);
    pendingPermissions.clear();
    for (Callback callback : callbacks) callback.invoke(payload);
  }

  private String microphoneState() {
    if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO)
        == PackageManager.PERMISSION_GRANTED) return "granted";
    return activity.getPreferences(Activity.MODE_PRIVATE).getBoolean(PERMISSION_PREF, false)
        ? "denied" : "not-determined";
  }

  private boolean recognizerAvailable() {
    return SpeechRecognizer.isRecognitionAvailable(activity);
  }

  private boolean onDeviceAvailable() {
    return Build.VERSION.SDK_INT >= 31 && Api31Impl.isOnDeviceRecognitionAvailable(activity);
  }

  private JavaOnlyMap statusPayload() {
    Active current = active;
    JavaOnlyMap payload = new JavaOnlyMap();
    payload.putString("microphone", microphoneState());
    // Android has no separate speech-recognition runtime permission.
    payload.putString("speechRecognition", "granted");
    payload.putBoolean("recognizerAvailable", recognizerAvailable() || onDeviceAvailable());
    payload.putBoolean("supportsOnDevice", onDeviceAvailable());
    payload.putString("locale", LOCALE);
    payload.putBoolean("listening", current != null);
    payload.putInt("bufferCount", current == null ? 0 : current.session.bufferCount());
    payload.putDouble("level", current == null ? 0 : current.session.level());
    payload.putDouble("peakLevel", current == null ? 0 : current.session.peakLevel());
    return payload;
  }

  private JavaOnlyMap resultPayload(String status, Active current, int errorCode, String errorMessage) {
    return resultPayload(status, current == null ? null : current.session,
        current, errorCode, errorMessage);
  }

  private JavaOnlyMap resultPayload(String status, SpeechRecognitionSession session, Active current,
      int errorCode, String errorMessage) {
    JavaOnlyMap payload = new JavaOnlyMap();
    payload.putString("status", status);
    payload.putString("text", current == null ? "" : current.text);
    payload.putBoolean("isFinal", current != null && current.isFinal);
    payload.putString("microphone", microphoneState());
    payload.putString("speechRecognition", "granted");
    payload.putBoolean("requestedOnDevice", session != null && session.requestedOnDevice);
    payload.putBoolean("supportsOnDevice", session != null && session.supportsOnDevice);
    boolean requiresOnDevice = session != null && session.requiresOnDevice();
    payload.putBoolean("requiresOnDevice", requiresOnDevice);
    payload.putString("onDevice", requiresOnDevice ? "guaranteed" : "not-guaranteed");
    payload.putInt("bufferCount", session == null ? 0 : session.bufferCount());
    payload.putDouble("peakLevel", session == null ? 0 : session.peakLevel());
    payload.putDouble("averageLevel", session == null ? 0 : session.averageLevel());
    payload.putDouble("durationMs", session == null ? 0
        : session.durationMs(SystemClock.elapsedRealtime()));
    payload.putString("errorDomain", errorCode == 0 ? "" : ERROR_DOMAIN);
    payload.putInt("errorCode", errorCode);
    payload.putString("errorMessage", errorMessage == null ? "" : errorMessage);
    return payload;
  }

  /** Keeps API 31 methods out of the controller's pre-31 bytecode path. */
  private static final class Api31Impl {
    static SpeechRecognizer createOnDeviceSpeechRecognizer(Context context) {
      return SpeechRecognizer.createOnDeviceSpeechRecognizer(context);
    }

    static boolean isOnDeviceRecognitionAvailable(Context context) {
      return SpeechRecognizer.isOnDeviceRecognitionAvailable(context);
    }
  }
}
