package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertFalse;

import android.Manifest;
import android.app.Instrumentation;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.service.notification.StatusBarNotification;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

public final class PushNotificationModuleTest {
  private static MainActivity launch(Instrumentation instrumentation) {
    Context context = instrumentation.getTargetContext();
    Intent intent = new Intent(Intent.ACTION_MAIN);
    intent.setClass(context, MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    return (MainActivity) instrumentation.startActivitySync(intent);
  }

  @Test public void statusAndRegistrationKeepTheBridgeShape() throws InterruptedException {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    MainActivity activity = launch(instrumentation);
    try {
      if (Build.VERSION.SDK_INT >= 33) instrumentation.getUiAutomation().grantRuntimePermission(
          activity.getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
      PushNotificationModule module = new PushNotificationModule(activity, activity.pushNotifications);
      CountDownLatch statusDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> status = new AtomicReference<>();
      module.getStatus(values -> {
        status.set((JavaOnlyMap) values[0]);
        statusDone.countDown();
      });
      assertTrue(statusDone.await(5, TimeUnit.SECONDS));
      assertEquals("authorized", status.get().getString("permission"));

      CountDownLatch registerDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> registration = new AtomicReference<>();
      module.register(values -> {
        registration.set((JavaOnlyMap) values[0]);
        registerDone.countDown();
      });
      assertTrue(registerDone.await(15, TimeUnit.SECONDS));
      assertEquals("authorized", registration.get().getString("permission"));
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }

  @Test public void forgedLauncherTargetIsIgnoredAndTrustedTapIsReturnedOnce() throws InterruptedException {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    MainActivity activity = launch(instrumentation);
    try {
      Intent notification = new Intent(activity, MainActivity.class);
      String target = "{\"kind\":\"notifications\"}";
      notification.putExtra("target", target);
      instrumentation.runOnMainSync(() -> activity.onNewIntent(notification));
      PushNotificationModule module = new PushNotificationModule(activity, activity.pushNotifications);
      CountDownLatch forgedDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> forged = new AtomicReference<>();
      module.takeOpened(values -> {
        forged.set((JavaOnlyMap) values[0]);
        forgedDone.countDown();
      });
      assertTrue(forgedDone.await(5, TimeUnit.SECONDS));
      assertTrue(forged.get().isNull("target"));
      PushOpenedStore.store(activity, target);
      instrumentation.runOnMainSync(() -> activity.onNewIntent(
          new Intent(activity, MainActivity.class)));
      CountDownLatch firstDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> first = new AtomicReference<>();
      module.takeOpened(values -> {
        first.set((JavaOnlyMap) values[0]);
        firstDone.countDown();
      });
      assertTrue(firstDone.await(5, TimeUnit.SECONDS));
      assertEquals("notifications", first.get().getMap("target").getString("kind"));
      CountDownLatch secondDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> second = new AtomicReference<>();
      module.takeOpened(values -> {
        second.set((JavaOnlyMap) values[0]);
        secondDone.countDown();
      });
      assertTrue(secondDone.await(5, TimeUnit.SECONDS));
      assertTrue(second.get().isNull("target"));
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }

  @Test public void foregroundNotificationUsesTheSharedChannelAndTapTarget()
      throws Exception {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    MainActivity activity = launch(instrumentation);
    try {
      if (Build.VERSION.SDK_INT >= 33) instrumentation.getUiAutomation().grantRuntimePermission(
          activity.getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
      NotificationManager notifications = activity.getSystemService(NotificationManager.class);
      notifications.cancelAll();
      assertTrue(DuruFirebaseMessagingService.postForegroundNotification(activity,
          "Episode", "A new message", "{\"kind\":\"notifications\"}"));
      StatusBarNotification[] active = notifications.getActiveNotifications();
      long deadline = SystemClock.uptimeMillis() + 3000;
      while (active.length == 0 && SystemClock.uptimeMillis() < deadline) {
        SystemClock.sleep(100);
        active = notifications.getActiveNotifications();
      }
      assertEquals(1, active.length);
      assertEquals(DuruFirebaseMessagingService.CHANNEL_ID,
          active[0].getNotification().getChannelId());
      assertTrue(active[0].getNotification().contentIntent != null);
      assertEquals(PushNotificationTapActivity.class.getName(),
          DuruFirebaseMessagingService.tapIntent(activity,
              "{\"kind\":\"notifications\"}").getComponent().getClassName());
      assertFalse(activity.getPackageManager().getActivityInfo(
          DuruFirebaseMessagingService.tapIntent(activity, "{}").getComponent(), 0).exported);
      assertEquals("{\"kind\":\"notifications\"}",
          DuruFirebaseMessagingService.tapIntent(activity,
              "{\"kind\":\"notifications\"}").getStringExtra("target"));
      notifications.cancelAll();
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }
}
