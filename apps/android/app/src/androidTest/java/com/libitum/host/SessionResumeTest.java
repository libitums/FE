package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.jsbridge.network.HttpRequest;
import com.lynx.jsbridge.network.HttpResponse;
import com.lynx.jsbridge.network.HttpStreamingDelegate;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import com.lynx.tasm.service.ILynxHttpService;
import com.lynx.tasm.service.LynxHttpRequestCallback;
import com.lynx.tasm.service.LynxServiceCenter;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Each method runs in a separate app process through test-session-resume.sh. */
@RunWith(AndroidJUnit4.class)
public final class SessionResumeTest {
  private static final String KEY = "libitum.auth.session";
  private static final String REFRESH_URL =
      "https://example.invalid/auth/v1/token?grant_type=refresh_token";

  private StorageModule storage() {
    return new StorageModule(InstrumentationRegistry.getInstrumentation().getTargetContext());
  }

  private static String token(int stage) {
    return stage == 0 ? "seed-refresh" : "rotated-refresh-" + stage;
  }

  private static LynxBaseUI findTestId(LynxBaseUI node, String testId) {
    if (node == null) return null;
    if (testId.equals(node.getTestID()) || testId.equals(node.getIdSelector())) return node;
    for (LynxBaseUI child : node.getChildren()) {
      LynxBaseUI result = findTestId(child, testId);
      if (result != null) return result;
    }
    return null;
  }

  private static LynxBaseUI findLabel(LynxBaseUI node, String label) {
    if (node == null) return null;
    CharSequence description = node.getAccessibilityLabel();
    if (description != null && label.contentEquals(description)) return node;
    for (LynxBaseUI child : node.getChildren()) {
      LynxBaseUI result = findLabel(child, label);
      if (result != null) return result;
    }
    return null;
  }

  private static void awaitScreen(LynxView view, String testId) {
    long deadline = SystemClock.uptimeMillis() + 15000;
    while (SystemClock.uptimeMillis() < deadline) {
      if (findTestId(view.getLynxUIRoot(), testId) != null) return;
      SystemClock.sleep(200);
    }
    assertNotNull(testId + " did not render", findTestId(view.getLynxUIRoot(), testId));
  }

  private static void awaitLabel(LynxView view, String label) {
    long deadline = SystemClock.uptimeMillis() + 15000;
    while (SystemClock.uptimeMillis() < deadline) {
      if (findLabel(view.getLynxUIRoot(), label) != null) return;
      SystemClock.sleep(200);
    }
    assertNotNull(label + " did not render", findLabel(view.getLynxUIRoot(), label));
  }

  private static final class AuthService implements ILynxHttpService {
    final AtomicReference<String> requestBody = new AtomicReference<>();
    final boolean reject;
    final int stage;

    AuthService(boolean reject, int stage) {
      this.reject = reject;
      this.stage = stage;
    }

    @Override public void request(HttpRequest request, LynxHttpRequestCallback callback) {
      HttpResponse response = new HttpResponse();
      response.setUrl(request.getUrl());
      JavaOnlyMap headers = new JavaOnlyMap();
      headers.putString("content-type", "application/json");
      response.setHttpHeaders(headers);
      if (REFRESH_URL.equals(request.getUrl())) {
        requestBody.set(new String(request.getHttpBody(), StandardCharsets.UTF_8));
        response.setStatusCode(reject ? 400 : 200);
        response.setStatusText(reject ? "Bad Request" : "OK");
        String body = reject
            ? "{\"error_code\":\"refresh_token_not_found\"}"
            : "{\"access_token\":\"rotated-access-" + stage
                + "\",\"refresh_token\":\"rotated-refresh-" + stage
                + "\",\"expires_in\":3600}";
        response.setHttpBody(body.getBytes(StandardCharsets.UTF_8));
      } else {
        response.setStatusCode(404);
        response.setStatusText("Not Found");
        response.setHttpBody("{}".getBytes(StandardCharsets.UTF_8));
      }
      callback.invoke(response);
    }

    @Override public void requestStreaming(
        HttpRequest request, LynxHttpRequestCallback callback, HttpStreamingDelegate delegate) {
      request(request, callback);
    }
  }

  private static void awaitRequest(AuthService service, String expectedToken) throws JSONException {
    long deadline = SystemClock.uptimeMillis() + 15000;
    while (service.requestBody.get() == null && SystemClock.uptimeMillis() < deadline) {
      SystemClock.sleep(200);
    }
    assertNotNull("refresh request missing", service.requestBody.get());
    assertEquals(expectedToken, new JSONObject(service.requestBody.get()).getString("refresh_token"));
  }

  private static void awaitStoredToken(StorageModule storage, String expectedToken)
      throws JSONException {
    long deadline = SystemClock.uptimeMillis() + 15000;
    while (SystemClock.uptimeMillis() < deadline) {
      String raw = storage.get(KEY);
      if (raw != null && expectedToken.equals(new JSONObject(raw).getString("refreshToken"))) {
        return;
      }
      SystemClock.sleep(200);
    }
    assertEquals(expectedToken, new JSONObject(storage.get(KEY)).getString("refreshToken"));
  }

  private static void awaitCleared(StorageModule storage) {
    long deadline = SystemClock.uptimeMillis() + 15000;
    while (storage.get(KEY) != null && SystemClock.uptimeMillis() < deadline) {
      SystemClock.sleep(200);
    }
    assertNull("rejected refresh retained session", storage.get(KEY));
  }

  private static MainActivity launch(Instrumentation instrumentation) {
    String url = InstrumentationRegistry.getArguments().getString("bundleUrl");
    assertNotNull("bundleUrl instrumentation argument missing", url);
    Intent intent = new Intent(Intent.ACTION_MAIN);
    intent.setClass(instrumentation.getTargetContext(), MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    intent.putExtra("bundle-url", url);
    return (MainActivity) instrumentation.startActivitySync(intent);
  }

  private static LynxView view(MainActivity activity) {
    return (LynxView) ((android.view.ViewGroup) activity.findViewById(android.R.id.content))
        .getChildAt(0);
  }

  @Test public void seedSession() throws JSONException {
    StorageModule storage = storage();
    storage.set(KEY, "{\"accessToken\":\"seed-access\",\"refreshToken\":\"seed-refresh\",\"expiresAt\":1}");
    assertEquals(token(0), new JSONObject(storage.get(KEY)).getString("refreshToken"));
  }

  @Test public void resumeSession() throws JSONException {
    int stage = Integer.parseInt(InstrumentationRegistry.getArguments().getString("stage"));
    StorageModule storage = storage();
    assertEquals(token(stage - 1), new JSONObject(storage.get(KEY)).getString("refreshToken"));
    AuthService service = new AuthService(false, stage);
    LynxServiceCenter.inst().registerService(ILynxHttpService.class, service);
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    MainActivity activity = launch(instrumentation);
    awaitRequest(service, token(stage - 1));
    awaitStoredToken(storage, token(stage));
    awaitScreen(view(activity), "journey-map-screen");
    instrumentation.runOnMainSync(activity::finish);
  }

  @Test public void rejectedRefreshClearsSession() throws JSONException {
    StorageModule storage = storage();
    assertEquals(token(2), new JSONObject(storage.get(KEY)).getString("refreshToken"));
    AuthService service = new AuthService(true, 0);
    LynxServiceCenter.inst().registerService(ILynxHttpService.class, service);
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    MainActivity activity = launch(instrumentation);
    awaitRequest(service, token(2));
    awaitCleared(storage);
    awaitLabel(view(activity), "Sign in with Apple");
    instrumentation.runOnMainSync(activity::finish);
  }
}
