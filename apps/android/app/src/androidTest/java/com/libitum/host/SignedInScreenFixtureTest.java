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
import android.util.Log;
import com.google.firebase.messaging.FirebaseMessaging;
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

/**
 * Keeps a signed-in Debug activity alive while Maestro (or a manual e2e procedure) checks a screen.
 *
 * <p>Instrumentation arguments, all optional. With none of them the fixture behaves exactly as it
 * always has (a fake session, only the token refresh answered with 200, everything else 404):
 *
 * <ul>
 *   <li>{@code noSession=true} - no session is seeded (onboarding).
 *   <li>{@code audioProgress} / {@code speechProgress} / {@code writingProgress} /
 *       {@code reviewProgress} = {@code true} - seed device-side progress so the listening, speaking
 *       or writing unit (or the review state) opens from the map.
 *   <li>{@code visualNovelProgress=true} - seed progress that makes the {@code visual-novel} map item
 *       the available one (intro, the first four steps, the messenger and the phone call done).
 *   <li>{@code finalProgress=true} - seed progress that makes the final test the available one
 *       (everything before it done, the final test not).
 *   <li>{@code completeProgress=true} - seed progress with the whole tutorial episode done (the
 *       roleplay tab opens). The episode survey bottom sheet may open over the map as a side effect.
 *   <li>{@code loadProgress=true} - answer the server progress load ({@code load_learning_progress})
 *       with 200. The body is the seeded snapshot when one of the seed options above is set, and
 *       JSON {@code null} (a user who never saved anything) otherwise. That is what raises
 *       {@code hasLoadedProgress}, which the first-unit guide needs; without this option the load
 *       keeps getting 404 and the guide never shows. The access token is JWT-shaped (a {@code sub}
 *       claim) whenever any seed or {@code loadProgress} is set, because the progress sync is keyed
 *       by the user id in the token.
 * </ul>
 *
 * <p>Only request paths are logged (tag {@code PushRefreshProbe}); tokens and bodies never are.
 */
public final class SignedInScreenFixtureTest {
  private static final String STOP_ACTION = "com.libitum.host.test.STOP_SIGNED_IN_FIXTURE";
  private static final String PUSH_ACTION = "com.libitum.host.test.POST_PUSH_FIXTURE";
  private static final String ROTATE_ACTION = "com.libitum.host.test.ROTATE_FCM_TOKEN";
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
  private static final String LOAD_PROGRESS_PATH = "/rest/v1/rpc/load_learning_progress";
  // Intro, steps 1-4, messenger and phone call done; the visual novel (map order: next) is available.
  private static final String VISUAL_NOVEL_PROGRESS = "{\"version\":1,\"completedStepCount\":4,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"active\",\"beatIndex\":0},"
      + "\"completedEpisodeFinalIds\":[]}";
  // Everything done, final test included (the roleplay tab opens). The progress sync then sees the
  // tutorial episode complete, so the episode survey sheet (a bottom sheet) may open over the map.
  private static final String COMPLETE_PROGRESS = "{\"version\":1,\"completedStepCount\":8,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[\"tutorial-final-test\"]}";
  // All eight steps and the visual novel done; the final test (map order: last) is available.
  private static final String FINAL_PROGRESS = "{\"version\":1,\"completedStepCount\":8,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[]}";
  private static final String REVIEW_PROGRESS = "{\"version\":1,\"completedStepCount\":1000,"
      + "\"completedEpisodeIntroIds\":[],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[\"tutorial-final-test\"]}";

  private static final class AuthService implements ILynxHttpService {
    private final String accessToken;
    /** Body for the progress load, or null to keep answering it with 404 (the default). */
    private final String progressLoadBody;

    AuthService(String accessToken, String progressLoadBody) {
      this.accessToken = accessToken;
      this.progressLoadBody = progressLoadBody;
    }

    @Override public void request(HttpRequest request, LynxHttpRequestCallback callback) {
      Log.i("PushRefreshProbe", "http " + pathOf(request.getUrl()));
      HttpResponse response = new HttpResponse();
      response.setUrl(request.getUrl());
      JavaOnlyMap headers = new JavaOnlyMap();
      headers.putString("content-type", "application/json");
      response.setHttpHeaders(headers);
      boolean refresh = REFRESH_URL.equals(request.getUrl());
      boolean progressLoad = progressLoadBody != null
          && LOAD_PROGRESS_PATH.equals(pathOf(request.getUrl()));
      boolean ok = refresh || progressLoad;
      response.setStatusCode(ok ? 200 : 404);
      response.setStatusText(ok ? "OK" : "Not Found");
      String body = refresh
          ? "{\"access_token\":\"" + accessToken
              + "\",\"refresh_token\":\"fixture-refresh\",\"expires_in\":3600}"
          : progressLoad ? progressLoadBody : "{}";
      response.setHttpBody(body.getBytes(StandardCharsets.UTF_8));
      callback.invoke(response);
    }

    @Override public void requestStreaming(
        HttpRequest request, LynxHttpRequestCallback callback, HttpStreamingDelegate delegate) {
      request(request, callback);
    }
  }

  /** Path only: the query (tokens) and host are never logged. */
  private static String pathOf(String url) {
    try {
      String path = java.net.URI.create(url).getPath();
      return path == null ? "" : path;
    } catch (RuntimeException error) {
      return "(unparsable)";
    }
  }

  /** Rotates the FCM token inside the app process (procedure T2 · T3 in docs/e2e). */
  private static void rotateFcmToken() {
    FirebaseMessaging fcm = FirebaseMessaging.getInstance();
    fcm.deleteToken().addOnCompleteListener(deleted -> {
      Log.i("PushRefreshProbe", "deleteToken ok=" + deleted.isSuccessful());
      fcm.getToken().addOnCompleteListener(
          got -> Log.i("PushRefreshProbe", "getToken ok=" + got.isSuccessful()));
    });
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
    boolean noSession = "true".equals(InstrumentationRegistry.getArguments().getString("noSession"));
    if (!noSession) new StorageModule(context).set("libitum.auth.session",
        "{\"accessToken\":\"fixture-access\",\"refreshToken\":\"fixture-seed\",\"expiresAt\":1}");
    boolean audioProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("audioProgress"));
    boolean speechProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("speechProgress"));
    boolean writingProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("writingProgress"));
    boolean reviewProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("reviewProgress"));
    boolean visualNovelProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("visualNovelProgress"));
    boolean finalProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("finalProgress"));
    boolean loadProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("loadProgress"));
    boolean completeProgress = "true".equals(
        InstrumentationRegistry.getArguments().getString("completeProgress"));
    String seed = completeProgress ? COMPLETE_PROGRESS
        : reviewProgress ? REVIEW_PROGRESS
        : finalProgress ? FINAL_PROGRESS
        : writingProgress ? WRITING_PROGRESS
        : speechProgress ? SPEECH_PROGRESS
        : visualNovelProgress ? VISUAL_NOVEL_PROGRESS
        : audioProgress ? AUDIO_PROGRESS
        : null;
    String accessToken = seed != null || loadProgress
        ? "fixture." + Base64.getUrlEncoder().withoutPadding().encodeToString(
            "{\"sub\":\"audio-fixture\"}".getBytes(StandardCharsets.UTF_8)) + ".signature"
        : "fixture-access";
    if (seed != null) new StorageModule(context).set("libitum.progress.pending.audio-fixture", seed);
    // A user who never saved a snapshot gets JSON null; otherwise the server "has" what the device seeded.
    String progressLoadBody = loadProgress ? (seed != null ? seed : "null") : null;
    LynxServiceCenter.inst().registerService(
        ILynxHttpService.class, new AuthService(accessToken, progressLoadBody));

    CountDownLatch stop = new CountDownLatch(1);
    BroadcastReceiver receiver = new BroadcastReceiver() {
      @Override public void onReceive(Context ignored, Intent intent) {
        if (STOP_ACTION.equals(intent.getAction())) stop.countDown();
        if (ROTATE_ACTION.equals(intent.getAction())) rotateFcmToken();
        if (PUSH_ACTION.equals(intent.getAction())) {
          DuruFirebaseMessagingService.postForegroundNotification(context,
              "Duru test", "Open notifications", "{\"kind\":\"notifications\"}");
        }
      }
    };
    IntentFilter controls = new IntentFilter();
    controls.addAction(STOP_ACTION);
    controls.addAction(PUSH_ACTION);
    controls.addAction(ROTATE_ACTION);
    if (Build.VERSION.SDK_INT >= 33) {
      context.registerReceiver(receiver, controls, Context.RECEIVER_EXPORTED);
    } else {
      context.registerReceiver(receiver, controls);
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
      if (!noSession) {
        long deadline = SystemClock.uptimeMillis() + 20000;
        while (!hasTestIdOnMainThread(instrumentation, view, "journey-map-screen")
            && SystemClock.uptimeMillis() < deadline) {
          SystemClock.sleep(200);
        }
        assertTrue("signed-in journey screen did not render",
            hasTestIdOnMainThread(instrumentation, view, "journey-map-screen"));
      }
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
