package com.libitum.host;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.SystemClock;
import com.lynx.jsbridge.network.HttpRequest;
import com.lynx.jsbridge.network.HttpResponse;
import com.lynx.jsbridge.network.HttpStreamingDelegate;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import com.lynx.tasm.service.ILynxHttpService;
import com.lynx.tasm.service.LynxHttpRequestCallback;
import com.lynx.tasm.service.LynxServiceCenter;
import androidx.test.platform.app.InstrumentationRegistry;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.Test;

/** Keeps a signed-in Debug activity alive while Maestro checks the settings screen. */
public final class SignedInScreenFixtureTest {
  private static final String STOP_ACTION = "com.libitum.host.test.STOP_SIGNED_IN_FIXTURE";
  private static final String REFRESH_URL =
      "https://example.invalid/auth/v1/token?grant_type=refresh_token";

  private static final class AuthService implements ILynxHttpService {
    @Override public void request(HttpRequest request, LynxHttpRequestCallback callback) {
      HttpResponse response = new HttpResponse();
      response.setUrl(request.getUrl());
      JavaOnlyMap headers = new JavaOnlyMap();
      headers.putString("content-type", "application/json");
      response.setHttpHeaders(headers);
      boolean refresh = REFRESH_URL.equals(request.getUrl());
      response.setStatusCode(refresh ? 200 : 404);
      response.setStatusText(refresh ? "OK" : "Not Found");
      String body = refresh
          ? "{\"access_token\":\"fixture-access\",\"refresh_token\":\"fixture-refresh\",\"expires_in\":3600}"
          : "{}";
      response.setHttpBody(body.getBytes(StandardCharsets.UTF_8));
      callback.invoke(response);
    }

    @Override public void requestStreaming(
        HttpRequest request, LynxHttpRequestCallback callback, HttpStreamingDelegate delegate) {
      request(request, callback);
    }
  }

  private static boolean hasTestId(LynxBaseUI node, String testId) {
    if (node == null) return false;
    if (testId.equals(node.getTestID()) || testId.equals(node.getIdSelector())) return true;
    for (LynxBaseUI child : node.getChildren()) {
      if (hasTestId(child, testId)) return true;
    }
    return false;
  }

  @Test public void keepSignedInScreenForMaestro() throws InterruptedException {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    Context context = instrumentation.getTargetContext();
    String bundleUrl = InstrumentationRegistry.getArguments().getString("bundleUrl");
    assertNotNull("bundleUrl instrumentation argument missing", bundleUrl);
    new StorageModule(context).set("libitum.auth.session",
        "{\"accessToken\":\"fixture-access\",\"refreshToken\":\"fixture-seed\",\"expiresAt\":1}");
    LynxServiceCenter.inst().registerService(ILynxHttpService.class, new AuthService());

    CountDownLatch stop = new CountDownLatch(1);
    BroadcastReceiver receiver = new BroadcastReceiver() {
      @Override public void onReceive(Context ignored, Intent intent) {
        if (STOP_ACTION.equals(intent.getAction())) stop.countDown();
      }
    };
    context.registerReceiver(receiver, new IntentFilter(STOP_ACTION), Context.RECEIVER_EXPORTED);
    MainActivity activity = null;
    try {
      Intent launch = new Intent(Intent.ACTION_MAIN);
      launch.setClass(context, MainActivity.class);
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      launch.putExtra("bundle-url", bundleUrl);
      activity = (MainActivity) instrumentation.startActivitySync(launch);
      LynxView view = (LynxView) ((android.view.ViewGroup) activity.findViewById(android.R.id.content))
          .getChildAt(0);
      long deadline = SystemClock.uptimeMillis() + 20000;
      while (!hasTestId(view.getLynxUIRoot(), "journey-map-screen")
          && SystemClock.uptimeMillis() < deadline) {
        SystemClock.sleep(200);
      }
      assertTrue("signed-in journey screen did not render",
          hasTestId(view.getLynxUIRoot(), "journey-map-screen"));
      assertTrue("Maestro did not send the fixture stop broadcast", stop.await(180, TimeUnit.SECONDS));
    } finally {
      context.unregisterReceiver(receiver);
      if (activity != null) {
        MainActivity launched = activity;
        instrumentation.runOnMainSync(launched::finish);
      }
    }
  }
}
