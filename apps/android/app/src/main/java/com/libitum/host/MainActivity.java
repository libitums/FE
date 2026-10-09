package com.libitum.host;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Build;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.Window;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
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
import com.lynx.tasm.utils.DisplayMetricsHolder;
import com.lynx.xelement.XElementBehaviors;
import java.util.Map;

public final class MainActivity extends Activity {
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private Runnable backTimeout;
  private Callback authCallback;
  private String authScheme;
  private boolean leftForAuthentication;
  private AudioPlaybackController audioPlayback;
  private SoundEffectsController soundEffects;
  private SpeechRecognitionController speechRecognition;
  PushNotificationController pushNotifications;
  StatusBarIconSync statusBarIcons;
  private LynxView lynxView;
  private Map<String, Object> lastSafeAreaInsets;
  private final ReducedMotionWatcher reducedMotionWatcher = new ReducedMotionWatcher();
  private Boolean lastReducedMotion;
  private final SystemBackGate backGate = new SystemBackGate();
  private OnBackInvokedCallback backCallback;
  private final PushTokenRefreshRelay.Listener tokenRefreshListener = this::sendPushTokenRefreshed;

  @Override protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    layoutEdgeToEdge();
    statusBarIcons = new StatusBarIconSync(getWindow());
    boolean bundled = !BuildConfig.DEBUG;
    String override = getIntent().getStringExtra("bundle-url");
    String templateUrl = HostPaths.template(BuildConfig.DEBUG, override);
    LynxViewBuilder builder = new LynxViewBuilder();
    builder.setTemplateProvider(new AndroidTemplateProvider(this));
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
    soundEffects = new SoundEffectsController(this);
    builder.registerModule("SoundEffectsModule", SoundEffectsModule.class, soundEffects);
    speechRecognition = new SpeechRecognitionController(this);
    builder.registerModule("SpeechRecognitionModule", SpeechRecognitionModule.class,
        speechRecognition);
    builder.registerModule("HandwritingTraceModule", HandwritingTraceModule.class);
    builder.registerModule("AppReviewModule", AppReviewModule.class, this);
    pushNotifications = new PushNotificationController(this);
    builder.registerModule("PushNotificationModule", PushNotificationModule.class, pushNotifications);
    builder.registerModule("SystemBackModule", SystemBackModule.class, this);
    DebugSupport.configure(builder);
    lynxView = builder.build(this);
    lynxView.setImageInterceptor(new HostImageInterceptor(bundled, templateUrl));
    lynxView.addLynxViewClient(new LynxViewClient() {
      @Override public void onFirstScreen() {
        // Same main thread call as the page patch, so the icons flip with the surface (no post).
        if (!isFinishing() && !isDestroyed()) statusBarIcons.sync(lynxView);
        mainHandler.post(() -> AccessibilityTapBridge.sync(lynxView));
      }

      @Override public void onPageUpdate() {
        if (!isFinishing() && !isDestroyed()) statusBarIcons.sync(lynxView);
        mainHandler.post(() -> AccessibilityTapBridge.sync(lynxView));
      }
    });
    setContentView(lynxView);
    publishSafeAreaInsets();
    // safe area와 따로 보낸다(updateGlobalProps는 키 단위 병합). 로드 앞에 첫 값을 걸어 둔다.
    publishReducedMotion(reducedMotionWatcher.read(getContentResolver()));
    reducedMotionWatcher.start(getContentResolver(), mainHandler, this::publishReducedMotion);
    pushNotifications.captureOpened();
    lynxView.renderTemplateUrl(templateUrl, "");
    registerBackCallback();
    PushTokenRefreshRelay.PROCESS.attach(tokenRefreshListener);
  }

  // Called on the FCM executor thread; the global event goes out on the main thread, never queued.
  private void sendPushTokenRefreshed() {
    mainHandler.post(() -> {
      if (lynxView == null || isFinishing() || isDestroyed()) return;
      lynxView.sendGlobalEvent("pushTokenRefreshed", new JavaOnlyArray());
    });
  }

  // API 33+ goes through the back-invoked dispatcher; 26-32 uses onBackPressed().
  private void registerBackCallback() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
    backCallback = this::handleSystemBack;
    getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
        OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
  }

  @SuppressWarnings("deprecation")
  @Override public void onBackPressed() {
    handleSystemBack();
  }

  // Executes the gate's decision; the decision itself lives in SystemBackGate.
  private void handleSystemBack() {
    switch (backGate.press()) {
      case FINISH:
        finish();
        break;
      case DISPATCH:
        final String token = backGate.pendingToken();
        JavaOnlyArray args = new JavaOnlyArray();
        args.pushString(token);
        lynxView.sendGlobalEvent("systemBackPressed", args);
        backTimeout = () -> resolveBack(backGate.timeout(token));
        mainHandler.postDelayed(backTimeout, SystemBackGate.ACK_TIMEOUT_MS);
        break;
      case IGNORE:
      default:
        break;
    }
  }

  private void resolveBack(SystemBackGate.Resolution resolution) {
    if (resolution == SystemBackGate.Resolution.MOVE_TO_BACK && !isFinishing() && !isDestroyed()) {
      moveTaskToBack(true);
    }
  }

  // Called by SystemBackModule from the JS thread; the gate is main-thread only.
  void onSystemBackReady() {
    mainHandler.post(() -> {
      if (!isFinishing() && !isDestroyed()) backGate.markReady();
    });
  }

  void onSystemBackResponse(String token, String outcome) {
    mainHandler.post(() -> {
      if (!isFinishing() && !isDestroyed()) resolveBack(backGate.respond(token, outcome));
    });
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

  // 같은 값이면 보내지 않는다. 호출은 메인 루퍼다(onCreate, mainHandler 기반 ContentObserver).
  private void publishReducedMotion(boolean enabled) {
    if (lynxView == null || (lastReducedMotion != null && lastReducedMotion == enabled)) return;
    lastReducedMotion = enabled;
    lynxView.updateGlobalProps(ReducedMotion.globalProps(enabled));
  }

  private void publishSafeAreaInsets() {
    ViewCompat.setOnApplyWindowInsetsListener(lynxView, (view, windowInsets) -> {
      Insets insets = windowInsets.getInsets(
          WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
      // 시스템 바 중 터치를 가로채는 아래 높이(3버튼). 제스처는 0이다.
      int tappableBottom =
          windowInsets.getInsets(WindowInsetsCompat.Type.tappableElement()).bottom;
      Map<String, Object> props = SafeAreaInsets.globalProps(insets.top, insets.bottom,
          insets.left, insets.right, tappableBottom, getResources().getDisplayMetrics().density);
      if (!props.equals(lastSafeAreaInsets)) {
        lastSafeAreaInsets = props;
        lynxView.updateGlobalProps(props);
      }
      return windowInsets;
    });
  }

  /**
   * manifest `configChanges`가 선언한 값은 Activity를 재생성하지 않고 여기로 온다. Lynx는 구성
   * 변경을 스스로 듣지 않으므로 LynxView 크기(viewport)만 측정이 따라가고, 화면 크기와 safe area는
   * 호스트가 다시 넘긴다. 무엇이 바뀌었는지 가르지 않는다 — 값이 같으면 둘 다 아무 일도 하지 않는다.
   */
  @Override public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    if (lynxView == null || isFinishing() || isDestroyed()) return;
    DisplayMetrics screen = DisplayMetricsHolder.getRealScreenDisplayMetrics(this);
    lynxView.updateScreenMetrics(screen.widthPixels, screen.heightPixels);
    ViewCompat.requestApplyInsets(lynxView);
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
    reducedMotionWatcher.stop();
    PushTokenRefreshRelay.PROCESS.detach(tokenRefreshListener);
    if (backTimeout != null) {
      mainHandler.removeCallbacks(backTimeout);
      backTimeout = null;
    }
    if (backCallback != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
      backCallback = null;
    }
    finishWebAuthentication("failed", null);
    if (audioPlayback != null) audioPlayback.stop();
    if (soundEffects != null) soundEffects.release();
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
    if (soundEffects != null) soundEffects.stopAll();
    if (speechRecognition != null) speechRecognition.interrupt();
    super.onStop();
  }
}
