package com.libitum.host;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import java.lang.ref.WeakReference;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

/** Requests the Play in-app review flow after an episode survey. */
public final class AppReviewModule extends LynxModule {
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final ReviewRequestGate gate = new ReviewRequestGate();
  private final WeakReference<Activity> activityRef;
  private final ReviewManager manager;

  AppReviewModule(Context context, Activity activity, ReviewManager manager) {
    super(context);
    this.activityRef = new WeakReference<>(activity);
    this.manager = manager;
  }

  public AppReviewModule(Context context, Object param) {
    this(context, param instanceof Activity ? (Activity) param : null,
        ReviewManagerFactory.create(context.getApplicationContext()));
  }

  @LynxMethod public void requestReview() {
    mainHandler.post(() -> {
      if (!active(activityRef.get()) || !gate.begin()) return;
      try {
        manager.requestReviewFlow().addOnCompleteListener(request -> {
          Activity activity = activityRef.get();
          if (!request.isSuccessful() || !active(activity)) {
            gate.finish();
            return;
          }
          try {
            manager.launchReviewFlow(activity, request.getResult())
                .addOnCompleteListener(result -> gate.finish());
          } catch (RuntimeException error) {
            gate.finish();
          }
        });
      } catch (RuntimeException error) {
        gate.finish();
      }
    });
  }

  private static boolean active(Activity activity) {
    return activity != null && !activity.isFinishing() && !activity.isDestroyed();
  }
}
