package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.Manifest;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.firebase.FirebaseApp;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

/** Opt-in integration check against a configured Firebase app and Google Play emulator. */
public final class LiveFcmTokenTest {
  @Test public void bridgeReturnsARealFcmRegistration() throws Exception {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    assumeTrue("Run explicitly with -e liveFcm true",
        "true".equals(InstrumentationRegistry.getArguments().getString("liveFcm")));
    Context context = instrumentation.getTargetContext();
    assertFalse("google-services.json must initialize Firebase",
        FirebaseApp.getApps(context).isEmpty());
    try {
      context.getPackageManager().getPackageInfo("com.google.android.gms", 0);
    } catch (PackageManager.NameNotFoundException error) {
      throw new AssertionError("Google Play services are required", error);
    }

    if (Build.VERSION.SDK_INT >= 33) instrumentation.getUiAutomation().grantRuntimePermission(
        context.getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
    Intent launch = new Intent(Intent.ACTION_MAIN).setClass(context, MainActivity.class)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(launch);
    try {
      CountDownLatch done = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> response = new AtomicReference<>();
      instrumentation.runOnMainSync(() ->
          new PushNotificationModule(activity, activity.pushNotifications).register(values -> {
            response.set((JavaOnlyMap) values[0]);
            done.countDown();
          }));
      assertTrue("FCM registration callback timed out", done.await(20, TimeUnit.SECONDS));
      JavaOnlyMap registration = response.get();
      assertNotNull(registration);
      assertEquals("authorized", registration.getString("permission"));
      assertEquals("fcm", registration.getString("environment"));
      String storedToken = registration.getString("token");
      assertNotNull("FCM token was not issued", storedToken);
      assertTrue("FCM token storage contract failed", storedToken.matches("fcm\\.[A-Za-z0-9_-]+"));
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }
}
