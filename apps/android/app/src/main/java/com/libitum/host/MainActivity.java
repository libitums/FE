package com.libitum.host;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Window;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.lynx.tasm.LynxBooleanOption;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.LynxViewBuilder;
import com.lynx.tasm.LynxViewClient;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyArray;
import com.lynx.xelement.XElementBehaviors;
import java.util.Map;

public final class MainActivity extends Activity {
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private Callback authCallback;
  private String authScheme;
  private boolean leftForAuthentication;
  private AudioPlaybackController audioPlayback;
  private SpeechRecognitionController speechRecognition;
  PushNotificationController pushNotifications;
  private LynxView lynxView;
  private Map<String, Object> lastSafeAreaInsets;

  @Override protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    layoutEdgeToEdge();
    boolean bundled = !BuildConfig.DEBUG;
    String override = getIntent().getStringExtra("bundle-url");
    String templateUrl = HostPaths.template(BuildConfig.DEBUG, override);
    LynxViewBuilder builder = new LynxViewBuilder();
    builder.setTemplateProvider(new AndroidTemplateProvider(this));
    builder.setMediaResourceFetcher(new BundledMediaFetcher(bundled, templateUrl));
    builder.setEnableGenericResourceFetcher(LynxBooleanOption.TRUE);
    builder.setFontScale(getResources().getConfiguration().fontScale);
    builder.addBehaviors(new XElementBehaviors().create());
    builder.registerModule("StorageModule", StorageModule.class);
    builder.registerModule("WebAuthenticationModule", WebAuthenticationModule.class, this);
    builder.registerModule("LegalDocumentModule", LegalDocumentModule.class, this);
    builder.registerModule("CompletionAnnouncementModule", CompletionAnnouncementModule.class,
        getWindow().getDecorView());
    audioPlayback = new AudioPlaybackController(this);
    builder.registerModule("AudioPlaybackModule", AudioPlaybackModule.class, audioPlayback);
    speechRecognition = new SpeechRecognitionController(this);
    builder.registerModule("SpeechRecognitionModule", SpeechRecognitionModule.class,
        speechRecognition);
    builder.registerModule("HandwritingTraceModule", HandwritingTraceModule.class);
    builder.registerModule("AppReviewModule", AppReviewModule.class, this);
    pushNotifications = new PushNotificationController(this);
    builder.registerModule("PushNotificationModule", PushNotificationModule.class, pushNotifications);
    DebugSupport.configure(builder);
    lynxView = builder.build(this);
    lynxView.addLynxViewClient(new LynxViewClient() {
      @Override public void onFirstScreen() {
        mainHandler.post(() -> AccessibilityTapBridge.sync(lynxView));
      }

      @Override public void onPageUpdate() {
        mainHandler.post(() -> AccessibilityTapBridge.sync(lynxView));
      }
    });
    setContentView(lynxView);
    publishSafeAreaInsets();
    pushNotifications.captureOpened();
    lynxView.renderTemplateUrl(templateUrl, "");
  }

  /**
   * LynxView는 시스템 바 뒤까지 전체 화면이다(iOS 호스트와 같다). targetSdk 35부터는 시스템이
   * 이를 강제하므로 버전과 무관하게 같은 배치를 쓴다. 가려지는 크기는 globalProps
   * `safeAreaInsets`로 넘기고 앱 셸이 그만큼 안쪽 여백을 잡는다(mobile `lib/safe-area.ts`).
   */
  private void layoutEdgeToEdge() {
    Window window = getWindow();
    WindowCompat.setDecorFitsSystemWindows(window, false);
    window.setStatusBarColor(Color.TRANSPARENT);
    window.setNavigationBarColor(Color.TRANSPARENT);
    WindowInsetsControllerCompat bars =
        WindowCompat.getInsetsController(window, window.getDecorView());
    bars.setAppearanceLightStatusBars(true);
    bars.setAppearanceLightNavigationBars(true);
  }

  private void publishSafeAreaInsets() {
    ViewCompat.setOnApplyWindowInsetsListener(lynxView, (view, windowInsets) -> {
      Insets insets = windowInsets.getInsets(
          WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
      Map<String, Object> props = SafeAreaInsets.globalProps(insets.top, insets.bottom,
          insets.left, insets.right, getResources().getDisplayMetrics().density);
      if (!props.equals(lastSafeAreaInsets)) {
        lastSafeAreaInsets = props;
        lynxView.updateGlobalProps(props);
      }
      return windowInsets;
    });
  }

  void startWebAuthentication(String url, String scheme, Callback callback) {
    if (authCallback != null) {
      callback.invoke(WebAuthenticationModule.payload("already-active", null));
      return;
    }
    authCallback = callback;
    authScheme = scheme;
    leftForAuthentication = false;
    try {
      new CustomTabsIntent.Builder().build().launchUrl(this, Uri.parse(url));
    } catch (RuntimeException error) {
      finishWebAuthentication("failed", null);
    }
  }

  @Override protected void onPause() {
    if (authCallback != null) leftForAuthentication = true;
    super.onPause();
  }

  @Override protected void onResume() {
    super.onResume();
    if (leftForAuthentication && authCallback != null) {
      // A browser close resumes us without a redirect. Allow an incoming redirect intent first.
      Callback pending = authCallback;
      mainHandler.postDelayed(() -> {
        if (authCallback == pending) finishWebAuthentication("cancelled", null);
      }, 500);
    }
  }

  @Override protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    if (pushNotifications != null && pushNotifications.captureOpened() && lynxView != null) {
      lynxView.sendGlobalEvent("pushNotificationOpened", new JavaOnlyArray());
    }
    String callbackUrl = intent.getDataString();
    if (authCallback != null && WebAuthContract.expectedRedirect(callbackUrl, authScheme)) {
      finishWebAuthentication("completed", callbackUrl);
    }
  }

  private void finishWebAuthentication(String status, String callbackUrl) {
    Callback callback = authCallback;
    if (callback == null) return;
    authCallback = null;
    authScheme = null;
    leftForAuthentication = false;
    callback.invoke(WebAuthenticationModule.payload(status, callbackUrl));
  }

  @Override protected void onDestroy() {
    finishWebAuthentication("failed", null);
    if (audioPlayback != null) audioPlayback.stop();
    if (speechRecognition != null) speechRecognition.destroy();
    if (pushNotifications != null) pushNotifications.destroy();
    super.onDestroy();
  }

  @Override public void onRequestPermissionsResult(
      int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (speechRecognition != null) speechRecognition.onRequestPermissionsResult(requestCode);
    if (pushNotifications != null) pushNotifications.onRequestPermissionsResult(requestCode);
  }

  @Override protected void onStart() {
    super.onStart();
    if (audioPlayback != null) audioPlayback.startHost();
  }

  @Override protected void onStop() {
    if (audioPlayback != null) audioPlayback.interrupt();
    if (speechRecognition != null) speechRecognition.interrupt();
    super.onStop();
  }
}
