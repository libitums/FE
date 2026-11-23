package com.libitum.host;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.SpeechRecognizer;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

/**
 * Owns microphone permission and one Android speech recognizer on the main thread.
 *
 * <p>An on-device request whose recognizer cannot do ko-KR (its model is missing, known up front on
 * API 33+ or from a language error at runtime) is retried once on the network recognizer. The retry
 * keeps the same session, so the callback still fires exactly once and the result discloses
 * {@code requiresOnDevice=false} with the fallback reason (ADR-0017, 2026-11-19).
 */
final class SpeechRecognitionController {
  private static final int MICROPHONE_REQUEST = 701;
  private static final long FINALIZE_TIMEOUT_MS = 3000;
  private static final long PACK_CHECK_TIMEOUT_MS = 1000;
  private static final String LOCALE = SpeechModelSupport.LOCALE;
  private static final String ERROR_DOMAIN = "android.speech.SpeechRecognizer";
  private static final String PERMISSION_PREF = "microphone-requested";

  /** Where download progress goes; MainActivity forwards it as a global event. */
  interface ProgressSink {
    void send(int percent);
  }

  private final Activity activity;
  private final Handler main = new Handler(Looper.getMainLooper());
  private final Executor mainExecutor = command -> main.post(command);
  private final List<Callback> pendingPermissions = new ArrayList<>();
  private Active active;
  /** Last answered pack check; null until asked. A pack that is downloading is asked again. */
  private String cachedPack;
  private SpeechRecognizer downloader;
  /** Pack checks still waiting for the system; destroy() releases them since it also drops their timeouts. */
  private final List<SpeechRecognizer> packProbes = new ArrayList<>();
  private ProgressSink progressSink;

  private static final class Active {
    final SpeechRecognitionSession session;
    final Callback callback;
    SpeechRecognizer recognizer;
    String text = "";
    boolean isFinal;
    boolean stopping;
    boolean checking;
    long listeningSinceMs;

    Active(SpeechRecognitionSession session, SpeechRecognizer recognizer, Callback callback) {
      this.session = session;
      this.recognizer = recognizer;
      this.callback = callback;
    }
  }

  SpeechRecognitionController(Activity activity) { this.activity = activity; }

  void setProgressSink(ProgressSink sink) { progressSink = sink; }

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

  /** Opens this app's details page in system settings; failing to open leaves the app in place. */
  void openSettings() {
    main.post(() -> {
      Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
      intent.setData(Uri.fromParts("package", activity.getPackageName(), null));
      try {
        activity.startActivity(intent);
      } catch (RuntimeException ignored) {
        // Nothing to open; the screen stays as it is.
      }
    });
  }

  void stop() {
    main.post(() -> {
      Active current = active;
      if (current == null || current.stopping) return;
      current.stopping = true;
      if (current.checking) {
        finish(current, "recognition-failed", SpeechRecognizer.ERROR_CLIENT,
            "Stopped before listening");
        return;
      }
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
      releaseDownloader();
      releasePackProbes();
      main.removeCallbacksAndMessages(null);
    });
  }

  /** Answers the on-device ko-KR pack status: unsupported without an on-device service, unknown below 33. */
  void getKoreanPack(Callback callback) {
    main.post(() -> {
      if (!onDeviceAvailable()) {
        callback.invoke(packPayload(SpeechRecognitionRoute.PACK_UNSUPPORTED));
        return;
      }
      if (Build.VERSION.SDK_INT < 33 || active != null) {
        callback.invoke(packPayload(cachedPack == null ? SpeechRecognitionRoute.PACK_UNKNOWN
            : cachedPack));
        return;
      }
      SpeechRecognizer probe;
      try {
        probe = SpeechModelSupport.createOnDevice(activity);
      } catch (RuntimeException error) {
        callback.invoke(packPayload(SpeechRecognitionRoute.PACK_UNKNOWN));
        return;
      }
      packProbes.add(probe);
      boolean[] settled = { false };
      SpeechModelSupport.PackCallback settle = pack -> {
        if (settled[0]) return;
        settled[0] = true;
        packProbes.remove(probe);
        release(probe);
        rememberPack(pack);
        callback.invoke(packPayload(pack));
      };
      main.postDelayed(() -> settle.onPack(SpeechRecognitionRoute.PACK_UNKNOWN),
          PACK_CHECK_TIMEOUT_MS);
      try {
        SpeechModelSupport.checkKoreanPack(probe, mainExecutor, settle);
      } catch (RuntimeException error) {
        settle.onPack(SpeechRecognitionRoute.PACK_UNKNOWN);
      }
    });
  }

  /** Hands the ko-KR model download to the system (API 33+); the callback fires exactly once. */
  void downloadKoreanPack(Callback callback) {
    main.post(() -> {
      if (Build.VERSION.SDK_INT < 33 || !onDeviceAvailable()) {
        callback.invoke(downloadPayload("unsupported", 0));
        return;
      }
      releaseDownloader();
      boolean[] settled = { false };
      SpeechModelSupport.DownloadCallback listener = new SpeechModelSupport.DownloadCallback() {
        @Override public void onProgress(int percent) {
          ProgressSink sink = progressSink;
          if (!settled[0] && sink != null) sink.send(percent);
        }

        @Override public void onDone(String status, int errorCode) {
          if (settled[0]) return;
          settled[0] = true;
          // Ask again next time; only a finished download is known to be installed.
          cachedPack = "completed".equals(status) ? SpeechRecognitionRoute.PACK_INSTALLED : null;
          // API 33 cannot report an outcome, so its recognizer stays until the next request.
          if (!"requested".equals(status)) releaseDownloader();
          callback.invoke(downloadPayload(status, errorCode));
        }
      };
      try {
        downloader = SpeechModelSupport.createOnDevice(activity);
        SpeechModelSupport.downloadKoreanPack(downloader, mainExecutor, listener);
      } catch (RuntimeException error) {
        listener.onDone("failed", SpeechRecognizer.ERROR_CLIENT);
      }
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
    boolean networkAvailable = recognizerAvailable();
    if (!networkAvailable && !supportsOnDevice) {
      callback.invoke(resultPayload("recognizer-unavailable", null, 0, ""));
      return;
    }
    SpeechRecognitionSession session = new SpeechRecognitionSession(
        requestedOnDevice, supportsOnDevice, SystemClock.elapsedRealtime());
    session.observeKoreanPack(cachedPack);
    // A pack already known to be missing goes straight to the network recognizer.
    if (session.requiresOnDevice() && networkAvailable
        && SpeechRecognitionRoute.fallBackBeforeStart(cachedPack)) {
      session.fallBackToNetwork(SpeechRecognitionRoute.FALLBACK_PACK_MISSING, 0);
    }
    SpeechRecognizer recognizer = null;
    try {
      // Match iOS: request on-device by default, but disclose an unavailable guarantee
      // in the result rather than silently claiming one for the platform recognizer.
      recognizer = session.requiresOnDevice()
          ? SpeechModelSupport.createOnDevice(activity)
          : SpeechRecognizer.createSpeechRecognizer(activity);
      Active current = new Active(session, recognizer, callback);
      active = current;
      if (session.requiresOnDevice() && networkAvailable && cachedPack == null
          && Build.VERSION.SDK_INT >= 33) {
        checkThenListen(current);
        return;
      }
      listen(current);
    } catch (RuntimeException error) {
      String status = error instanceof SecurityException ? "permission-denied"
          : "recognizer-unavailable";
      if (active != null && active.session == session) {
        finish(active, status, SpeechRecognizer.ERROR_CLIENT, error.getMessage());
      } else {
        release(recognizer);
        callback.invoke(resultPayload(status, session, null,
            SpeechRecognizer.ERROR_CLIENT, error.getMessage()));
      }
    }
  }

  /** Asks the on-device recognizer for ko-KR before listening; an unanswered check keeps it on-device. */
  private void checkThenListen(Active current) {
    current.checking = true;
    SpeechModelSupport.PackCallback after = pack -> {
      if (active != current || !current.checking) return;
      current.checking = false;
      rememberPack(pack);
      current.session.observeKoreanPack(pack);
      if (SpeechRecognitionRoute.fallBackBeforeStart(pack)
          && switchToNetwork(current, SpeechRecognitionRoute.FALLBACK_PACK_MISSING, 0)) {
        return;
      }
      listen(current);
    };
    main.postDelayed(() -> after.onPack(SpeechRecognitionRoute.PACK_UNKNOWN), PACK_CHECK_TIMEOUT_MS);
    try {
      SpeechModelSupport.checkKoreanPack(current.recognizer, mainExecutor, after);
    } catch (RuntimeException error) {
      after.onPack(SpeechRecognitionRoute.PACK_UNKNOWN);
    }
  }

  private void listen(Active current) {
    try {
      SpeechRecognizer recognizer = current.recognizer;
      recognizer.setRecognitionListener(listener(current, recognizer));
      current.listeningSinceMs = SystemClock.elapsedRealtime();
      recognizer.startListening(SpeechModelSupport.recognizerIntent());
    } catch (RuntimeException error) {
      String status = error instanceof SecurityException ? "permission-denied"
          : "recognizer-unavailable";
      finish(current, status, SpeechRecognizer.ERROR_CLIENT, error.getMessage());
    }
  }

  /**
   * Retries this request once on the network recognizer. False when it cannot (already retried,
   * not on-device, or no network recognizer); the caller then settles the original outcome.
   */
  private boolean switchToNetwork(Active current, String reason, int errorCode) {
    if (!recognizerAvailable() || !current.session.fallBackToNetwork(reason, errorCode)) return false;
    SpeechRecognizer previous = current.recognizer;
    try { previous.cancel(); } catch (RuntimeException ignored) { }
    release(previous);
    try {
      current.recognizer = SpeechRecognizer.createSpeechRecognizer(activity);
    } catch (RuntimeException error) {
      finish(current, "recognizer-unavailable", SpeechRecognizer.ERROR_CLIENT, error.getMessage());
      return true;
    }
    listen(current);
    return true;
  }

  private RecognitionListener listener(Active current, SpeechRecognizer recognizer) {
    return new RecognitionListener() {
      // A replaced recognizer's late callbacks belong to no one.
      private boolean live() { return active == current && current.recognizer == recognizer; }

      @Override public void onReadyForSpeech(Bundle params) { }
      @Override public void onBeginningOfSpeech() { }
      @Override public void onRmsChanged(float rmsDb) {
        if (live()) current.session.observeLevel(rmsDb);
      }
      @Override public void onBufferReceived(byte[] buffer) {
        if (live() && buffer != null && buffer.length > 0) current.session.observeBuffer();
      }
      @Override public void onEndOfSpeech() { }
      @Override public void onError(int error) {
        if (!live()) return;
        long listeningMs = SystemClock.elapsedRealtime() - current.listeningSinceMs;
        if (current.session.requiresOnDevice() && !current.stopping
            && SpeechRecognitionRoute.fallBackOnError(error, listeningMs, !current.text.isEmpty())
            && switchToNetwork(current, SpeechRecognitionRoute.FALLBACK_ON_DEVICE_ERROR, error)) {
          return;
        }
        String status = error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS
            ? "permission-denied" : error == SpeechRecognizer.ERROR_AUDIO
            ? "audio-failed" : error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY
            || error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED
            ? "recognizer-unavailable" : "recognition-failed";
        finish(current, status, error, "Recognition error " + error);
      }
      @Override public void onResults(Bundle results) {
        if (!live()) return;
        updateText(current, results);
        current.isFinal = true;
        finish(current, "recognized", 0, "");
      }
      @Override public void onPartialResults(Bundle partialResults) {
        if (live()) updateText(current, partialResults);
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
    current.checking = false;
    try { current.recognizer.cancel(); } catch (RuntimeException ignored) { }
    release(current.recognizer);
    current.callback.invoke(resultPayload(status, current, errorCode, errorMessage));
  }

  private void rememberPack(String pack) {
    cachedPack = SpeechRecognitionRoute.PACK_DOWNLOADING.equals(pack) ? null : pack;
  }

  private static void release(SpeechRecognizer recognizer) {
    if (recognizer == null) return;
    try { recognizer.destroy(); } catch (RuntimeException ignored) { }
  }

  private void releaseDownloader() {
    release(downloader);
    downloader = null;
  }

  private void releasePackProbes() {
    for (SpeechRecognizer probe : packProbes) release(probe);
    packProbes.clear();
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
    return SpeechModelSupport.onDeviceAvailable(activity);
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

  private static JavaOnlyMap packPayload(String pack) {
    JavaOnlyMap payload = new JavaOnlyMap();
    payload.putString("koreanPack", pack);
    return payload;
  }

  private static JavaOnlyMap downloadPayload(String status, int errorCode) {
    JavaOnlyMap payload = new JavaOnlyMap();
    payload.putString("status", status);
    payload.putInt("errorCode", errorCode);
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
    String pack = session != null ? session.koreanPack()
        : cachedPack == null ? SpeechRecognitionRoute.PACK_UNKNOWN : cachedPack;
    payload.putString("koreanPack", pack);
    payload.putString("fallback", session == null ? SpeechRecognitionRoute.FALLBACK_NONE
        : session.fallback());
    payload.putInt("fallbackErrorCode", session == null ? 0 : session.fallbackErrorCode());
    return payload;
  }
}
