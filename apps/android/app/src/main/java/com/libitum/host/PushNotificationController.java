package com.libitum.host;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

/** Owns Android permission, FCM registration, and opened notification state. */
final class PushNotificationController {
  private static final int PERMISSION_REQUEST = 703;
  private static final String PERMISSION_REQUESTED = "push-permission-requested";
  private static final long TOKEN_TIMEOUT_MS = 10_000;

  private final Activity activity;
  private final Handler main = new Handler(Looper.getMainLooper());
  private final List<Callback> registrations = new ArrayList<>();
  private JavaOnlyMap openedTarget;
  private int registrationRound;
  private boolean destroyed;

  PushNotificationController(Activity activity) { this.activity = activity; }

  void getStatus(Callback callback) {
    main.post(() -> callback.invoke(permissionPayload(permission())));
  }

  void register(Callback callback) {
    main.post(() -> {
      if (destroyed) {
        callback.invoke(permissionPayload(permission()));
        return;
      }
      registrations.add(callback);
      if (registrations.size() > 1) return;
      if (!"not-determined".equals(permission())) {
        completeAfterPermission();
        return;
      }
      activity.getPreferences(Activity.MODE_PRIVATE).edit()
          .putBoolean(PERMISSION_REQUESTED, true).apply();
      try {
        activity.requestPermissions(
            new String[] { Manifest.permission.POST_NOTIFICATIONS }, PERMISSION_REQUEST);
      } catch (RuntimeException error) {
        completeAfterPermission();
      }
    });
  }

  void onRequestPermissionsResult(int requestCode) {
    if (requestCode == PERMISSION_REQUEST) main.post(this::completeAfterPermission);
  }

  void takeOpened(Callback callback) {
    main.post(() -> {
      JavaOnlyMap payload = new JavaOnlyMap();
      JavaOnlyMap target = openedTarget;
      openedTarget = null;
      if (target == null) payload.putNull("target");
      else payload.putMap("target", target);
      callback.invoke(payload);
    });
  }

  void openSettings() {
    main.post(() -> {
      Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
      intent.putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
      try {
        activity.startActivity(intent);
      } catch (RuntimeException ignored) {
        // Failing to open system settings leaves the app in place.
      }
    });
  }

  /** Reads only the one-shot handoff written by the private tap Activity. */
  boolean captureOpened() {
    JavaOnlyMap target = targetFromJson(PushOpenedStore.take(activity));
    if (target == null) return false;
    openedTarget = target;
    return true;
  }

  void destroy() {
    main.post(() -> {
      destroyed = true;
      complete(null);
    });
  }

  private String permission() {
    NotificationManager manager = activity.getSystemService(NotificationManager.class);
    boolean enabled = manager != null && manager.areNotificationsEnabled();
    boolean granted = Build.VERSION.SDK_INT < 33
        || activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED;
    boolean requested = activity.getPreferences(Activity.MODE_PRIVATE)
        .getBoolean(PERMISSION_REQUESTED, false);
    return PushPermissionState.name(Build.VERSION.SDK_INT, granted, enabled, requested);
  }

  private void completeAfterPermission() {
    if (registrations.isEmpty()) return;
    if (!"authorized".equals(permission())) {
      complete(null);
      return;
    }
    // No config is a supported local-build state; permission still works without a token.
    if (FirebaseApp.getApps(activity).isEmpty()) {
      complete(null);
      return;
    }
    int round = ++registrationRound;
    main.postDelayed(() -> {
      if (registrationRound == round) complete(null);
    }, TOKEN_TIMEOUT_MS);
    try {
      FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> main.post(() -> {
        if (registrationRound != round) return;
        complete(task.isSuccessful() ? PushTokenCodec.stored(task.getResult()) : null);
      }));
    } catch (RuntimeException error) {
      complete(null);
    }
  }

  private void complete(String storedToken) {
    if (registrations.isEmpty()) return;
    List<Callback> callbacks = new ArrayList<>(registrations);
    registrations.clear();
    registrationRound++;
    JavaOnlyMap payload = permissionPayload(permission());
    if (storedToken != null) {
      payload.putString("token", storedToken);
      payload.putString("environment", "fcm");
    }
    for (Callback callback : callbacks) callback.invoke(payload);
  }

  private static JavaOnlyMap permissionPayload(String permission) {
    JavaOnlyMap payload = new JavaOnlyMap();
    payload.putString("permission", permission);
    return payload;
  }

  static JavaOnlyMap targetFromJson(String json) {
    if (json == null) return null;
    try {
      JSONObject source = new JSONObject(json);
      Object kind = source.opt("kind");
      if (source.length() > 0 && !(kind instanceof String)) return null;
      JavaOnlyMap target = new JavaOnlyMap();
      if (kind instanceof String) target.putString("kind", (String) kind);
      Object unitId = source.opt("unitId");
      if (unitId instanceof String) target.putString("unitId", (String) unitId);
      return target;
    } catch (JSONException error) {
      return null;
    }
  }
}
