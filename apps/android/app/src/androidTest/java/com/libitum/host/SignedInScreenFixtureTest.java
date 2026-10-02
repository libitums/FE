package com.libitum.host;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
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
import java.util.Base64;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.List;
import org.junit.Test;

/** Keeps a signed-in Debug activity alive while Maestro checks the settings screen. */
public final class SignedInScreenFixtureTest {
  private static final String STOP_ACTION = "com.libitum.host.test.STOP_SIGNED_IN_FIXTURE";
  private static final String REFRESH_URL =
      "https://example.invalid/auth/v1/token?grant_type=refresh_token";
  private static final String AUDIO_PROGRESS = "{\"version\":1,\"completedStepCount\":5,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[]}";
  private static final String SPEECH_PROGRESS = "{\"version\":1,\"completedStepCount\":6,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"completedVisualNovelUnitIds\":[\"cafe-arrival-visual-novel\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[]}";
  private static final String WRITING_PROGRESS = SPEECH_PROGRESS.replace(
      "\"completedStepCount\":6", "\"completedStepCount\":7");
  private static final String REVIEW_PROGRESS = "{\"version\":1,\"completedStepCount\":1000,"
      + "\"completedEpisodeIntroIds\":[],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[\"tutorial-final-test\"]}";

  private static final class AuthService implements ILynxHttpService {
    private final String accessToken;

    AuthService(String accessToken) {
      this.accessToken = accessToken;
    }

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
          ? "{\"access_token\":\"" + accessToken
              + "\",\"refresh_token\":\"fixture-refresh\",\"expires_in\":3600}"
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
    List<LynxBaseUI> children = node.getChildren();
    if (children != null) {
      for (LynxBaseUI child : children) {
        if (hasTestId(child, testId)) return true;
      }
    }
    return false;
  }

  private static boolean hasTestIdOnMainThread(
      Instrumentation instrumentation, LynxView view, String testId) {
    boolean[] found = new boolean[1];
    instrumentation.runOnMainSync(() -> found[0] = hasTestId(view.getLynxUIRoot(), testId));
    return found[0];
  }

  @Test public void keepSignedInScreenForMaestro() throws InterruptedException {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    Context context = instrumentation.getTargetContext();
    String bundleUrl = InstrumentationRegistry.getArguments().getString("bundleUrl");
    assertNotNull("bundleUrl instrumentation argument missing", bundleUrl);
    new StorageModule(context).set("libitum.auth.session",
        "{\"accessToken\":\"fixture-access\",\"refreshToken\":\"fixture-seed\",\"expiresAt\":1}");
    boolean audioProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("audioProgress"));
    boolean speechProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("speechProgress"));
    boolean writingProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("writingProgress"));
    boolean reviewProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("reviewProgress"));
    String accessToken = audioProgress || speechProgress || writingProgress || reviewProgress
        ? "fixture." + Base64.getUrlEncoder().withoutPadding().encodeToString(
            "{\"sub\":\"audio-fixture\"}".getBytes(StandardCharsets.UTF_8)) + ".signature"
        : "fixture-access";
    if (audioProgress || speechProgress || writingProgress || reviewProgress) {
      new StorageModule(context).set("libitum.progress.pending.audio-fixture",
          reviewProgress ? REVIEW_PROGRESS : writingProgress ? WRITING_PROGRESS
              : speechProgress ? SPEECH_PROGRESS : AUDIO_PROGRESS);
    }
    LynxServiceCenter.inst().registerService(ILynxHttpService.class, new AuthService(accessToken));

    CountDownLatch stop = new CountDownLatch(1);
    BroadcastReceiver receiver = new BroadcastReceiver() {
      @Override public void onReceive(Context ignored, Intent intent) {
        if (STOP_ACTION.equals(intent.getAction())) stop.countDown();
      }
    };
    if (Build.VERSION.SDK_INT >= 33) {
      context.registerReceiver(receiver, new IntentFilter(STOP_ACTION), Context.RECEIVER_EXPORTED);
    } else {
      context.registerReceiver(receiver, new IntentFilter(STOP_ACTION));
    }
    MainActivity activity = null;
    try {
      Intent launch = new Intent(Intent.ACTION_MAIN);
      launch.setClass(context, MainActivity.class);
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      launch.putExtra("bundle-url", bundleUrl);
      MainActivity launchedActivity = (MainActivity) instrumentation.startActivitySync(launch);
      activity = launchedActivity;
      android.view.View[] firstChild = new android.view.View[1];
      instrumentation.runOnMainSync(() -> {
        android.view.ViewGroup content = launchedActivity.findViewById(android.R.id.content);
        if (content != null) firstChild[0] = content.getChildAt(0);
      });
      assertTrue("Activity content is missing a LynxView", firstChild[0] instanceof LynxView);
      LynxView view = (LynxView) firstChild[0];
      long deadline = SystemClock.uptimeMillis() + 20000;
      while (!hasTestIdOnMainThread(instrumentation, view, "journey-map-screen")
          && SystemClock.uptimeMillis() < deadline) {
        SystemClock.sleep(200);
      }
      assertTrue("signed-in journey screen did not render",
          hasTestIdOnMainThread(instrumentation, view, "journey-map-screen"));
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
