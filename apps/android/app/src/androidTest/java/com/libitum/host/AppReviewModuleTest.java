package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.testing.FakeReviewManager;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.TaskCompletionSource;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class AppReviewModuleTest {
  private static final class CountingManager implements ReviewManager {
    private final FakeReviewManager delegate;
    private TaskCompletionSource<ReviewInfo> pending = new TaskCompletionSource<>();
    final AtomicInteger requests = new AtomicInteger();
    final AtomicInteger launches = new AtomicInteger();
    final CountDownLatch launched = new CountDownLatch(1);

    CountingManager(Context context) { delegate = new FakeReviewManager(context); }

    @Override public Task<ReviewInfo> requestReviewFlow() {
      requests.incrementAndGet();
      return pending.getTask();
    }

    @Override public Task<Void> launchReviewFlow(Activity activity, ReviewInfo info) {
      launches.incrementAndGet();
      launched.countDown();
      return delegate.launchReviewFlow(activity, info);
    }

    void finishRequest() { pending.setResult(delegate.requestReviewFlow().getResult()); }

    void failRequest() {
      TaskCompletionSource<ReviewInfo> current = pending;
      pending = new TaskCompletionSource<>();
      current.setException(new IllegalStateException("fake Play failure"));
    }
  }

  @Test public void requestLaunchesOnceOnActiveActivity() throws InterruptedException {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    Context context = instrumentation.getTargetContext();
    Intent intent = new Intent(Intent.ACTION_MAIN).setClass(context, MainActivity.class)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(intent);
    try {
      CountingManager manager = new CountingManager(context);
      AppReviewModule module = new AppReviewModule(context, activity, manager);
      module.requestReview();
      module.requestReview();
      instrumentation.waitForIdleSync();
      assertEquals(1, manager.requests.get());
      manager.finishRequest();
      assertTrue(manager.launched.await(3, TimeUnit.SECONDS));
      assertEquals(1, manager.launches.get());
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }

  @Test public void missingActivityDoesNotRequestPlayFlow() {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    CountingManager manager = new CountingManager(context);
    AppReviewModule module = new AppReviewModule(context, null, manager);
    module.requestReview();
    InstrumentationRegistry.getInstrumentation().waitForIdleSync();
    assertEquals(0, manager.requests.get());
    assertEquals(1, manager.launched.getCount());
  }

  @Test public void failedRequestCanBeRetriedWithoutLaunching() {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    Context context = instrumentation.getTargetContext();
    Intent intent = new Intent(Intent.ACTION_MAIN).setClass(context, MainActivity.class)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(intent);
    try {
      CountingManager manager = new CountingManager(context);
      AppReviewModule module = new AppReviewModule(context, activity, manager);
      module.requestReview();
      instrumentation.waitForIdleSync();
      assertEquals(1, manager.requests.get());
      manager.failRequest();
      instrumentation.waitForIdleSync();
      module.requestReview();
      instrumentation.waitForIdleSync();
      assertEquals(2, manager.requests.get());
      assertEquals(0, manager.launches.get());
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }
}
