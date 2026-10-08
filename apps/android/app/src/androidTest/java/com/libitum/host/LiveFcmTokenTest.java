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
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
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

  /** docs/e2e T1: after deleteToken -> getToken the relay receives the SDK notification. */
  @Test public void relayGetsNewTokenAfterDeleteToken() throws Exception {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    assumeTrue("Run explicitly with -e liveFcm true",
        "true".equals(InstrumentationRegistry.getArguments().getString("liveFcm")));
    Context context = instrumentation.getTargetContext();
    assertFalse("google-services.json must initialize Firebase",
        FirebaseApp.getApps(context).isEmpty());
    if (Build.VERSION.SDK_INT >= 33) instrumentation.getUiAutomation().grantRuntimePermission(
        context.getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
    Intent launch = new Intent(Intent.ACTION_MAIN).setClass(context, MainActivity.class)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(launch);
    try {
      String tokenA = registerToken(instrumentation, activity);
      AtomicInteger notified = new AtomicInteger();
      // Replaces MainActivity's listener and is never restored: finishing the Activity runs its
      // detach, which only removes its own listener (PushTokenRefreshRelay.detach).
      PushTokenRefreshRelay.PROCESS.attach(notified::incrementAndGet);
      Tasks.await(FirebaseMessaging.getInstance().deleteToken(), 20, TimeUnit.SECONDS);
      String tokenB = Tasks.await(FirebaseMessaging.getInstance().getToken(), 20, TimeUnit.SECONDS);
      long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
      while (notified.get() == 0 && System.nanoTime() < deadline) Thread.sleep(200);
      assertTrue("relay got no notification after deleteToken -> getToken", notified.get() >= 1);
      assertNotNull(tokenB);
      android.util.Log.i("PushRefreshProbe", "notified=" + notified.get()
          + " tokenChanged=" + !tokenB.equals(tokenA));
      String tokenC = registerToken(instrumentation, activity);
      assertTrue("FCM token storage contract failed", tokenC.matches("fcm\\.[A-Za-z0-9_-]+"));
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }

  private static String registerToken(Instrumentation instrumentation, MainActivity activity)
      throws InterruptedException {
    CountDownLatch done = new CountDownLatch(1);
    AtomicReference<JavaOnlyMap> response = new AtomicReference<>();
    instrumentation.runOnMainSync(() ->
        new PushNotificationModule(activity, activity.pushNotifications).register(values -> {
          response.set((JavaOnlyMap) values[0]);
          done.countDown();
        }));
    assertTrue("FCM registration callback timed out", done.await(20, TimeUnit.SECONDS));
    return response.get().getString("token");
  }
}
