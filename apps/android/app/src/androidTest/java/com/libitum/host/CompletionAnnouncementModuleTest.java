package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Context;
import android.content.Intent;
import android.os.Looper;
import android.view.View;
import android.view.accessibility.AccessibilityEvent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class CompletionAnnouncementModuleTest {
  private static final class CapturingView extends View {
    final AtomicReference<String> spoken = new AtomicReference<>();
    final AtomicInteger calls = new AtomicInteger();
    final AtomicBoolean onMainThread = new AtomicBoolean();

    CapturingView(Context context) { super(context); }

    @Override public void announceForAccessibility(CharSequence content) {
      spoken.set(content.toString());
      calls.incrementAndGet();
      onMainThread.set(Looper.myLooper() == Looper.getMainLooper());
    }
  }

  @Test public void announcesOriginalCompletionOnceAndSettlesCallbackOnMainThread()
      throws InterruptedException {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    CapturingView view = new CapturingView(context);
    CompletionAnnouncementModule module = new CompletionAnnouncementModule(context, view);
    JavaOnlyMap args = new JavaOnlyMap();
    String content = "문항을 모두 마쳤어요, 결과 보기\nAll done";
    args.putString("content", content);
    CountDownLatch settled = new CountDownLatch(1);
    AtomicInteger callbackCalls = new AtomicInteger();
    AtomicBoolean callbackOnMainThread = new AtomicBoolean();

    module.announce(args, values -> {
      callbackCalls.incrementAndGet();
      callbackOnMainThread.set(Looper.myLooper() == Looper.getMainLooper());
      settled.countDown();
    });

    assertTrue("completion callback did not settle", settled.await(3, TimeUnit.SECONDS));
    assertEquals(content, view.spoken.get());
    assertEquals(1, view.calls.get());
    assertTrue(view.onMainThread.get());
    assertEquals(1, callbackCalls.get());
    assertTrue(callbackOnMainThread.get());
  }

  @Test public void invalidContentSettlesWithoutAnnouncing() {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    CapturingView view = new CapturingView(context);
    CompletionAnnouncementModule module = new CompletionAnnouncementModule(context, view);
    JavaOnlyMap args = new JavaOnlyMap();
    args.putInt("content", 42);
    AtomicInteger callbackCalls = new AtomicInteger();

    module.announce(args, values -> callbackCalls.incrementAndGet());

    assertEquals(1, callbackCalls.get());
    assertEquals(0, view.calls.get());
    assertNull(view.spoken.get());
  }

  @Test public void attachedHostDispatchesAnAnnouncementEvent() throws Exception {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    Context context = instrumentation.getTargetContext();
    Intent launch = new Intent(Intent.ACTION_MAIN);
    launch.setClass(context, MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(launch);
    try {
      UiAutomation automation = instrumentation.getUiAutomation(
          UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      String content = "완료 안내, 결과 보기";
      JavaOnlyMap args = new JavaOnlyMap();
      args.putString("content", content);
      CompletionAnnouncementModule module = new CompletionAnnouncementModule(
          context, activity.getWindow().getDecorView());
      CountDownLatch settled = new CountDownLatch(1);

      AccessibilityEvent event = automation.executeAndWaitForEvent(
          () -> module.announce(args, values -> settled.countDown()),
          candidate -> candidate.getEventType() == AccessibilityEvent.TYPE_ANNOUNCEMENT
              && candidate.getText().contains(content),
          3000);

      assertEquals(AccessibilityEvent.TYPE_ANNOUNCEMENT, event.getEventType());
      assertTrue(settled.await(1, TimeUnit.SECONDS));
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }
}
