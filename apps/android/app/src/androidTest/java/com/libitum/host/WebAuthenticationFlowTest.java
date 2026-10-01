package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Intent;
import android.net.Uri;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class WebAuthenticationFlowTest {
  @Test public void registeredDeepLinkCompletesActiveBrowserRequestOnce() throws Exception {
    Intent launch = new Intent(Intent.ACTION_MAIN);
    launch.setClass(InstrumentationRegistry.getInstrumentation().getTargetContext(), MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    MainActivity activity = (MainActivity) InstrumentationRegistry.getInstrumentation().startActivitySync(launch);
    CountDownLatch completed = new CountDownLatch(1);
    AtomicInteger callbackCount = new AtomicInteger();
    AtomicReference<JavaOnlyMap> result = new AtomicReference<>();
    InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
        activity.startWebAuthentication("https://example.org/", "duru", values -> {
          callbackCount.incrementAndGet();
          result.set((JavaOnlyMap) values[0]);
          completed.countDown();
        }));

    InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
        activity.onNewIntent(new Intent(Intent.ACTION_VIEW,
            Uri.parse("duru://another-host?code=ignored"))));
    assertEquals(0, callbackCount.get());

    Intent redirect = new Intent(Intent.ACTION_VIEW, Uri.parse("duru://auth-callback?code=fake"));
    redirect.addCategory(Intent.CATEGORY_BROWSABLE);
    redirect.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    InstrumentationRegistry.getInstrumentation().getTargetContext().startActivity(redirect);

    assertTrue("OAuth deep link callback did not arrive", completed.await(5, TimeUnit.SECONDS));
    assertEquals("completed", result.get().getString("status"));
    assertEquals("duru://auth-callback?code=fake", result.get().getString("callbackUrl"));
    InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
        activity.onNewIntent(new Intent(Intent.ACTION_VIEW,
            Uri.parse("duru://auth-callback?code=duplicate"))));
    assertEquals(1, callbackCount.get());
    InstrumentationRegistry.getInstrumentation().runOnMainSync(activity::finish);
  }
}
