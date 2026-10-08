package com.libitum.host;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Displays user-visible data messages in foreground and background. A refreshed FCM token is only
 * relayed as a signal to the live Activity; it is never stored (ADR-0048).
 */
public final class DuruFirebaseMessagingService extends FirebaseMessagingService {
  static final String CHANNEL_ID = "duru-updates";
  private static final AtomicInteger nextNotificationId = new AtomicInteger(1000);

  static void createChannel(Context context) {
    NotificationManager notifications = context.getSystemService(NotificationManager.class);
    if (notifications == null) return;
    NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID, context.getString(R.string.notification_channel_name),
        NotificationManager.IMPORTANCE_DEFAULT);
    channel.setDescription(context.getString(R.string.notification_channel_description));
    notifications.createNotificationChannel(channel);
  }

  // Runs on the SDK executor thread. The token is deliberately unused: JS re-reads it through register.
  @Override public void onNewToken(String token) {
    PushTokenRefreshRelay.PROCESS.notifyRefreshed();
  }

  @Override public void onMessageReceived(RemoteMessage message) {
    postForegroundNotification(this, message.getData().get("title"),
        message.getData().get("body"), message.getData().get("target"));
  }

  /** Returns false when Android will not display a notification. Also used by instrumentation. */
  static boolean postForegroundNotification(
      Context context, String title, String body, String targetJson) {
    NotificationManager notifications = context.getSystemService(NotificationManager.class);
    if (notifications == null || !notifications.areNotificationsEnabled()) return false;
    if (Build.VERSION.SDK_INT >= 33
        && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) return false;
    createChannel(context);
    int id = nextNotificationId.incrementAndGet();
    Intent opened = tapIntent(context, targetJson);
    PendingIntent tap = PendingIntent.getActivity(context, id, opened,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification notification = new Notification.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle(title == null ? "Duru" : title)
        .setContentText(body == null ? "" : body)
        .setAutoCancel(true)
        .setContentIntent(tap)
        .build();
    notifications.notify(id, notification);
    return true;
  }

  static Intent tapIntent(Context context, String targetJson) {
    Intent opened = new Intent(context, PushNotificationTapActivity.class);
    if (targetJson != null) opened.putExtra("target", targetJson);
    return opened;
  }
}
