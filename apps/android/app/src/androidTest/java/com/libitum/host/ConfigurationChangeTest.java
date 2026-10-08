package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Application;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.graphics.Rect;
import android.util.DisplayMetrics;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.LynxViewClient;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import org.junit.After;
import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * android-orientation integration IC1~IC8 (계약 spec.md §5 · §6, 계획 test-plan.md).
 *
 * <p>설치된 앱의 병합 매니페스트(IC1)와 실제 {@link MainActivity}의 구성 변경 처리(IC2~IC7)를 본다.
 *
 * <p><b>이 클래스는 에뮬레이터 전역 설정을 바꾼다</b>(야간 모드 · 화면 크기 · 밀도 · 글꼴 배율 · 방향 재정의 ·
 * 회전 고정 · IC8은 내비게이션 모드 오버레이). 각 케이스 뒤 {@code @After}가 되돌리지만, 러너가 중간에 죽으면 남는다. 수동으로 되돌리려면:
 *
 * <pre>
 * adb -s &lt;device&gt; shell 'cmd uimode night no; wm size reset; wm density reset; settings put system font_scale 1.0; \
 *   settings put system user_rotation 0; settings put system accelerometer_rotation 0'
 * adb -s &lt;device&gt; shell 'wm set-ignore-orientation-request reset'   # API 36+ 에서만 있는 명령(API 30은 Unknown command)
 * # IC8(API 36+)이 죽었을 때만: 시작 때의 모드를 되찾는다. 모드는 {@code settings get secure navigation_mode}(0 = 3버튼 · 2 = 제스처),
 * # 오버레이는 {@code cmd overlay list | grep navbar}의 [x] 목록. 시작이 3버튼이었으면:
 * adb -s &lt;device&gt; shell 'cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.threebutton'
 * # 시작이 제스처였으면 같은 명령의 끝을 gestural로. 시작 때 두 오버레이가 모두 [x]였다면 `cmd overlay enable &lt;패키지&gt;`로
 * # 시작 모드의 오버레이를 마지막에 켜 우선순위를 되돌린다(docs/e2e/android-orientation.md의 restore_nav).
 * </pre>
 *
 * 회전 원복은 API 수준을 가리지 않는 {@code settings put system}만 쓴다({@code wm user-rotation}은 API 30에 없다).
 *
 * 시작 전 값(실측): 야간 {@code no} · 크기 재정의 없음 · 밀도 재정의 없음 · 배율 1.0 ·
 * {@code ignoreOrientationRequest=false} · 자동 회전 {@code 0}. 이 값이 아니면 케이스가 시작 전에
 * 이유를 적고 실패한다. Maestro · 다른 계측 · e2e와 동시에 돌리지 않는다.
 *
 * <p>번들 서버가 필요하다 — 실제 화면이 선 상태에서 재생성 여부와 화면 상태 유지를 가려야 한다.
 * {@code -e bundleUrl http://10.0.2.2:<port>/main.lynx.bundle}가 빠지면 이유를 적고 즉시 실패하고, 번들이
 * 실제로 로드되지 않으면(온보딩의 「Next」 버튼이 Lynx UI 트리에 서지 않으면) 「번들이 로드되지 않았다: &lt;url&gt;」로
 * 실패한다. 앱을 띄우지 않는 IC1은 서버가 필요 없다.
 *
 * <p>「재생성 없음」 = 같은 {@code MainActivity} 인스턴스(생성 1회 · 파괴 아님) + 같은 LynxView 객체.
 * 「화면 상태 유지」 = 변경 전에 온보딩을 다음 단계로 한 번 넘겨 두고, 변경 뒤에도 그 단계(「Back」 있음 ·
 * 「Step 1 of 3」 없음)에 있으며 페이지 로드 콜백({@code onPageStart} · {@code onLoadSuccess})이 더 불리지 않았다.
 * 신호는 Lynx UI 트리(접근성 서비스 · TalkBack 불필요)와 {@link LynxViewClient}다.
 * 변경이 실제로 전달됐는지는 해당 구성 필드로 먼저 확인한다. 「안 일어났다」는 부정은 상한 있는 폴링으로 본다.
 *
 * <p>첫 실행 온보딩에서 시작하려고 앱 저장소({@code duru-storage})를 비우고 {@code @After}에서 되돌린다.
 *
 * <p>API 30(36 미만)에서는 IC5 · IC8이 건너뛰어지는데, {@code OK (8 tests)}에 섞여 보이지 않는다(점이 6개인 것이 흔적).
 * 건너뜀은 {@code am instrument -r}의 {@code INSTRUMENTATION_STATUS_CODE: -4}로만 보인다.
 */
@RunWith(AndroidJUnit4.class)
public final class ConfigurationChangeTest {
  /** 계약 §5.1 · r02-3 B: configChanges 11값의 합 = 0x80002ff4(부호 있는 int로는 음수). assetsPaths는 compileSdk 36부터 공개. */
  private static final int HANDLED =
      ActivityInfo.CONFIG_ORIENTATION
          | ActivityInfo.CONFIG_SCREEN_SIZE
          | ActivityInfo.CONFIG_SMALLEST_SCREEN_SIZE
          | ActivityInfo.CONFIG_SCREEN_LAYOUT
          | ActivityInfo.CONFIG_UI_MODE
          | ActivityInfo.CONFIG_LOCALE
          | ActivityInfo.CONFIG_LAYOUT_DIRECTION
          | ActivityInfo.CONFIG_KEYBOARD
          | ActivityInfo.CONFIG_KEYBOARD_HIDDEN
          | ActivityInfo.CONFIG_NAVIGATION
          | ActivityInfo.CONFIG_ASSETS_PATHS;

  private static final String NAVBAR_PREFIX = "com.android.internal.systemui.navbar.";

  private static final long CHANGE_TIMEOUT_MS = 5000;
  /** 「재생성이 일어나지 않는다」를 보는 상한. 재생성이 보이면 바로 끝난다. */
  private static final long NO_RECREATION_WINDOW_MS = 2000;
  private static final long RECREATION_TIMEOUT_MS = 10000;
  /** 번들 로드(첫 화면이 서는 것)를 기다리는 상한. */
  private static final long BUNDLE_LOAD_TIMEOUT_MS = 20000;
  /** 온보딩 1단계에만 있는 버튼 · 2단계에만 있는 버튼 · 1단계 진행 표시. */
  private static final String NEXT = "Next";
  private static final String BACK = "Back";
  private static final String STEP_ONE = "Step 1 of 3";

  private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
  private final List<MainActivity> live = new CopyOnWriteArrayList<>();
  private final AtomicInteger created = new AtomicInteger();
  private final AtomicReference<MainActivity> latest = new AtomicReference<>();
  private Application.ActivityLifecycleCallbacks callbacks;
  private boolean launched;
  private String bundleUrl;
  /** 앱 저장소(SharedPreferences) 원본 — 첫 실행 온보딩에서 시작하려고 비웠다가 @After에서 되돌린다. */
  private Map<String, ?> savedStorage;
  // 페이지 로드 콜백 수(로드 완료 뒤에 0으로 맞춘다) · 마지막 로드 실패 사유.
  private final AtomicInteger pageLoads = new AtomicInteger();
  private final AtomicReference<String> loadFailure = new AtomicReference<>();

  // 시작 전 값 — @After가 이 값으로 되돌린다.
  private String originalNight = "no";
  private String originalFontScale = "1.0";
  private String originalAccelerometerRotation = "0";
  private String originalUserRotation = "0";
  /** IC8 전용: 시작 때의 `navigation_mode`와 navbar 오버레이 [x] 상태(패키지 -> 켜짐). null이면 IC8이 건드리지 않았다. */
  private String originalNavigationMode;
  private Map<String, Boolean> originalNavbarOverlays;

  /** 한 번 띄운 호스트의 처음 모습. */
  private static final class Host {
    MainActivity activity;
    LynxView lynxView;
    int decorHeight;
    Configuration configuration;
  }

  // ---- 도구 ----------------------------------------------------------------

  private UiAutomation automation() {
    return instrumentation.getUiAutomation();
  }

  /** 셸 명령을 끝까지 기다려 출력을 돌려준다. */
  private String shell(String command) {
    try (InputStream in =
            new ParcelFileDescriptor.AutoCloseInputStream(automation().executeShellCommand(command));
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[4096];
      for (int read = in.read(buffer); read >= 0; read = in.read(buffer)) out.write(buffer, 0, read);
      return out.toString("UTF-8").trim();
    } catch (IOException error) {
      throw new AssertionError("shell command failed: " + command, error);
    }
  }

  private static boolean await(long timeoutMs, BooleanSupplier condition) {
    long deadline = SystemClock.uptimeMillis() + timeoutMs;
    while (SystemClock.uptimeMillis() < deadline) {
      if (condition.getAsBoolean()) return true;
      SystemClock.sleep(50);
    }
    return condition.getAsBoolean();
  }

  private <T> T onMain(java.util.concurrent.Callable<T> task) {
    AtomicReference<T> result = new AtomicReference<>();
    AtomicReference<Throwable> failure = new AtomicReference<>();
    instrumentation.runOnMainSync(
        () -> {
          try {
            result.set(task.call());
          } catch (Throwable error) {
            failure.set(error);
          }
        });
    if (failure.get() != null) throw new AssertionError(failure.get());
    return result.get();
  }

  private void register() {
    Application application = (Application) instrumentation.getTargetContext().getApplicationContext();
    callbacks =
        new Application.ActivityLifecycleCallbacks() {
          @Override public void onActivityCreated(Activity activity, Bundle state) {
            if (activity instanceof MainActivity) {
              created.incrementAndGet();
              live.add((MainActivity) activity);
              latest.set((MainActivity) activity);
            }
          }

          @Override public void onActivityDestroyed(Activity activity) {
            live.remove(activity);
          }

          @Override public void onActivityStarted(Activity activity) {}

          @Override public void onActivityResumed(Activity activity) {}

          @Override public void onActivityPaused(Activity activity) {}

          @Override public void onActivityStopped(Activity activity) {}

          @Override public void onActivitySaveInstanceState(Activity activity, Bundle state) {}
        };
    application.registerActivityLifecycleCallbacks(callbacks);
  }

  /**
   * 전제를 스스로 확인한 뒤 MainActivity를 띄운다. 빠진 전제는 이유를 적고 즉시 실패한다.
   * 전역 설정을 바꾸기 전에 불러야 한다(시작 값을 기록한다).
   */
  private Host launch() {
    bundleUrl = InstrumentationRegistry.getArguments().getString("bundleUrl");
    assertNotNull(
        "precondition: instrumentation argument bundleUrl is missing — pass "
            + "-e bundleUrl http://10.0.2.2:<port>/main.lynx.bundle (serve the bundle first)",
        bundleUrl);

    String size = shell("wm size");
    assertFalse(
        "precondition: a 'wm size' override is already set (" + size + ") — run the restore command in the class comment",
        size.contains("Override size"));
    String density = shell("wm density");
    assertFalse(
        "precondition: a 'wm density' override is already set (" + density + ") — run the restore command in the class comment",
        density.contains("Override density"));
    if (Build.VERSION.SDK_INT >= 36) {
      assertFalse(
          "precondition: ignoreOrientationRequest is already true — run the restore command in the class comment",
          shell("wm get-ignore-orientation-request").startsWith("ignoreOrientationRequest true"));
    }
    originalNight = shell("cmd uimode night").replace("Night mode:", "").trim();
    assertEquals(
        "precondition: system night mode must start as 'no' — run the restore command in the class comment",
        "no",
        originalNight);
    originalFontScale = shell("settings get system font_scale");
    assertTrue(
        "precondition: font_scale must start at 1.0 (was " + originalFontScale + ") — run the restore command in the class comment",
        originalFontScale.equals("null") || Float.parseFloat(originalFontScale) == 1.0f);
    originalAccelerometerRotation = shell("settings get system accelerometer_rotation");
    originalUserRotation = shell("settings get system user_rotation");

    // 「화면 상태」를 보려면 첫 실행 온보딩에서 시작해야 한다. 저장소를 백업하고 비운다(@After가 되돌린다).
    SharedPreferences storage = storage();
    savedStorage = new java.util.HashMap<>(storage.getAll());
    assertTrue("precondition: could not clear the app storage", storage.edit().clear().commit());

    register();
    launched = true;
    Intent launch = new Intent(Intent.ACTION_MAIN);
    launch.setClass(instrumentation.getTargetContext(), MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    launch.putExtra("bundle-url", bundleUrl);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(launch);
    instrumentation.waitForIdleSync();
    LynxView started = lynxViewOf(activity);
    assertNotNull("precondition: content view's first child is not a LynxView", started);
    onMain(
        () -> {
          started.addLynxViewClient(
              new LynxViewClient() {
                @Override public void onPageStart(String url) {
                  pageLoads.incrementAndGet();
                }

                @Override public void onLoadSuccess() {
                  pageLoads.incrementAndGet();
                }

                @Override public void onLoadFailed(String error) {
                  loadFailure.set(error);
                }
              });
          return null;
        });

    View decor = activity.getWindow().getDecorView();
    assertTrue(
        "precondition: MainActivity window never got focus (device locked or another window in front?)",
        await(CHANGE_TIMEOUT_MS, () -> decor.isAttachedToWindow() && activity.hasWindowFocus()));

    Host host = new Host();
    host.activity = activity;
    host.lynxView = started;
    // 번들이 실제로 로드됐는지 — 404 · 서버 없음이면 온보딩 화면이 서지 않는다. 폴링(상한 있음).
    assertTrue(
        "번들이 로드되지 않았다: " + bundleUrl + " (no '" + NEXT + "' button in the Lynx UI tree within "
            + BUNDLE_LOAD_TIMEOUT_MS + " ms; onLoadFailed=" + loadFailure.get()
            + "; if the bundle is served, the app may not be on the first-run onboarding screen)",
        await(BUNDLE_LOAD_TIMEOUT_MS, () -> hasLabel(host, NEXT)));
    // 로드가 끝난 시점 이후의 로드 콜백만 센다.
    pageLoads.set(0);
    host.decorHeight = decor.getHeight();
    host.configuration = new Configuration(activity.getResources().getConfiguration());
    assertEquals(
        "precondition: MainActivity must start in portrait",
        Configuration.ORIENTATION_PORTRAIT,
        host.configuration.orientation);
    assertEquals("precondition: exactly one MainActivity created so far", 1, created.get());
    return host;
  }

  private SharedPreferences storage() {
    return instrumentation.getTargetContext().getSharedPreferences("duru-storage", android.content.Context.MODE_PRIVATE);
  }

  @SuppressWarnings("unchecked")
  private void restoreStorage(List<String> failures) {
    if (savedStorage == null) return;
    SharedPreferences.Editor editor = storage().edit().clear();
    for (Map.Entry<String, ?> entry : savedStorage.entrySet()) {
      Object value = entry.getValue();
      if (value instanceof String) editor.putString(entry.getKey(), (String) value);
      else if (value instanceof Boolean) editor.putBoolean(entry.getKey(), (Boolean) value);
      else if (value instanceof Integer) editor.putInt(entry.getKey(), (Integer) value);
      else if (value instanceof Long) editor.putLong(entry.getKey(), (Long) value);
      else if (value instanceof Float) editor.putFloat(entry.getKey(), (Float) value);
      else if (value instanceof Set) editor.putStringSet(entry.getKey(), (Set<String>) value);
    }
    if (!editor.commit()) failures.add("app storage (duru-storage) could not be restored");
    savedStorage = null;
  }

  private LynxView lynxViewOf(Activity activity) {
    return onMain(
        () -> {
          View first = ((ViewGroup) activity.findViewById(android.R.id.content)).getChildAt(0);
          return first instanceof LynxView ? (LynxView) first : null;
        });
  }

  // ---- 화면 상태(Lynx UI 트리) -----------------------------------------------

  private static LynxBaseUI findUi(LynxBaseUI node, String label) {
    if (node == null) return null;
    CharSequence description = node.getAccessibilityLabel();
    if (description != null && label.contentEquals(description)) return node;
    for (LynxBaseUI child : node.getChildren()) {
      LynxBaseUI found = findUi(child, label);
      if (found != null) return found;
    }
    return null;
  }

  private boolean hasLabel(Host host, String label) {
    return onMain(() -> findUi(host.lynxView.getLynxUIRoot(), label) != null);
  }

  private Rect rectOf(Host host, String label) {
    return onMain(
        () -> {
          LynxBaseUI ui = findUi(host.lynxView.getLynxUIRoot(), label);
          return ui == null ? null : new Rect(ui.getRectToWindow());
        });
  }

  private int rootHeight(Host host) {
    return onMain(() -> host.lynxView.getLynxUIRoot().getHeight());
  }

  /** 온보딩을 「Next」 탭으로 한 단계 넘겨 변경 전에 처음 화면과 구별되는 상태를 만든다. */
  private void advanceOnboarding(Host host) {
    Rect next = rectOf(host, NEXT);
    assertNotNull("precondition: '" + NEXT + "' button missing before advancing onboarding", next);
    long down = SystemClock.uptimeMillis();
    float x = next.centerX();
    float y = next.centerY();
    onMain(
        () -> {
          host.activity.dispatchTouchEvent(MotionEvent.obtain(down, down, MotionEvent.ACTION_DOWN, x, y, 0));
          return null;
        });
    onMain(
        () -> {
          host.activity.dispatchTouchEvent(
              MotionEvent.obtain(down, down + 60, MotionEvent.ACTION_UP, x, y, 0));
          return null;
        });
    assertTrue(
        "precondition: tapping '" + NEXT + "' did not advance onboarding (no '" + BACK + "' button)",
        await(CHANGE_TIMEOUT_MS, () -> hasLabel(host, BACK)));
    pageLoads.set(0);
  }

  /** 계약 §6의 「화면 상태 유지」: 페이지가 다시 로드되지 않았고 넘겨 둔 단계가 그대로다. */
  private void assertScreenStatePreserved(Host host, String change) {
    assertEquals(
        change + ": the page was reloaded (page load callbacks fired " + pageLoads.get() + " more times)",
        0,
        pageLoads.get());
    assertTrue(
        change + ": the onboarding step was lost — '" + BACK + "' is gone from the Lynx UI tree",
        hasLabel(host, BACK));
    assertFalse(
        change + ": the onboarding went back to the first step ('" + STEP_ONE + "' is showing)",
        hasLabel(host, STEP_ONE));
  }

  private static boolean isNight(Configuration configuration) {
    return (configuration.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
  }

  private boolean recreated(Host host) {
    return created.get() > 1 || host.activity.isDestroyed();
  }

  /**
   * 바뀐 값이 전달됐음을 확인한다(전달 안 된 채 「재생성 없음」으로 통과하지 않게). 재생성으로 전달된 경우도
   * 「전달됨」으로 세어 뒤의 같은-인스턴스 단언이 실패로 잡게 한다.
   */
  private void awaitDelivered(Host host, String what, BooleanSupplier onSameInstance) {
    assertTrue(
        what + " was not delivered to MainActivity within " + CHANGE_TIMEOUT_MS + " ms (neither a configuration update nor a recreation)",
        await(CHANGE_TIMEOUT_MS, () -> created.get() > 1 || onSameInstance.getAsBoolean()));
  }

  /** 계약 §6의 「같은 MainActivity · 같은 LynxView」. 재생성이 보이면 즉시 실패한다. */
  private void assertSameInstance(Host host, String change) {
    // 재생성은 비동기라 상한 안에서 보이는지를 본다. 보이면 바로 끝난다.
    await(NO_RECREATION_WINDOW_MS, () -> recreated(host));
    assertEquals(
        change + ": MainActivity was recreated (created " + created.get() + " times) — configChanges must absorb this change",
        1,
        created.get());
    assertFalse(change + ": the original MainActivity was destroyed", host.activity.isDestroyed());
    assertFalse(change + ": the original MainActivity is finishing", host.activity.isFinishing());
    assertSame(change + ": LynxView is not the same object", host.lynxView, lynxViewOf(host.activity));
  }

  /** 「재생성 수용」 값: 다른 인스턴스가 서고 처음 것은 파괴된다. */
  private MainActivity awaitRecreated(Host host, String change) {
    assertTrue(
        change + ": MainActivity was not recreated within " + RECREATION_TIMEOUT_MS + " ms — this value must stay out of configChanges",
        await(RECREATION_TIMEOUT_MS, () -> created.get() >= 2 && host.activity.isDestroyed()));
    MainActivity fresh = latest.get();
    assertNotSame(change + ": the newest MainActivity is the original instance", host.activity, fresh);
    assertNotSame(change + ": LynxView was not rebuilt", host.lynxView, lynxViewOf(fresh));
    return fresh;
  }

  @After public void restore() {
    if (!launched) return;
    // 살아 있는 MainActivity를 먼저 끝낸다 — 되돌리기가 또 재생성하지 않게.
    instrumentation.runOnMainSync(
        () -> {
          for (MainActivity activity : live) activity.finish();
        });
    await(CHANGE_TIMEOUT_MS, live::isEmpty);

    // 모든 원복 명령을 시도한 뒤, 실패를 모아 끝에서 던진다(삼키지 않는다).
    List<String> failures = new ArrayList<>();
    // 내비게이션 모드는 회전 값보다 먼저 되돌린다(3버튼 전환이 user_rotation을 바꾼 적이 있다).
    restoreNavigationMode(failures);
    restoreStep(failures, "cmd uimode night " + originalNight);
    restoreStep(failures, "wm size reset");
    restoreStep(failures, "wm density reset");
    if (originalFontScale.equals("null")) restoreStep(failures, "settings delete system font_scale");
    else restoreStep(failures, "settings put system font_scale " + originalFontScale);
    if (Build.VERSION.SDK_INT >= 36) restoreStep(failures, "wm set-ignore-orientation-request reset");
    String accelerometer = originalAccelerometerRotation.equals("null") ? "0" : originalAccelerometerRotation;
    String rotation = originalUserRotation.equals("null") ? "0" : originalUserRotation;
    restoreStep(failures, "settings put system user_rotation " + rotation);
    restoreStep(failures, "settings put system accelerometer_rotation " + accelerometer);
    expectValue(failures, "settings get system user_rotation", rotation);
    expectValue(failures, "settings get system accelerometer_rotation", accelerometer);
    restoreStorage(failures);
    String size = shell("wm size");
    if (size.contains("Override size")) failures.add("wm size still overridden: " + size);
    String density = shell("wm density");
    if (density.contains("Override density")) failures.add("wm density still overridden: " + density);

    if (callbacks != null) {
      ((Application) instrumentation.getTargetContext().getApplicationContext())
          .unregisterActivityLifecycleCallbacks(callbacks);
      callbacks = null;
    }
    assertTrue(
        "failed to restore the emulator settings — run the restore command in the class comment: " + failures,
        failures.isEmpty());
  }

  private void restoreStep(List<String> failures, String command) {
    String output = shell(command);
    if (output.contains("Unknown command") || output.contains("Exception") || output.startsWith("Error")) {
      failures.add("`" + command + "` -> " + output);
    }
  }

  /** `cmd overlay list`에서 navbar 오버레이의 [x] 상태를 읽는다(패키지 -> 켜짐). */
  private Map<String, Boolean> navbarOverlays() {
    Map<String, Boolean> overlays = new LinkedHashMap<>();
    java.util.regex.Matcher matcher =
        java.util.regex.Pattern.compile(
                "^\\[( |x)\\]\\s+(" + java.util.regex.Pattern.quote(NAVBAR_PREFIX) + "\\S+)\\s*$",
                java.util.regex.Pattern.MULTILINE)
            .matcher(shell("cmd overlay list"));
    while (matcher.find()) overlays.put(matcher.group(2), "x".equals(matcher.group(1)));
    return overlays;
  }

  /** 시작 때의 모드 값 -> 그 모드의 오버레이(나중에 켠 쪽이 이기므로 마지막에 켠다). */
  private static String overlayOfMode(String mode) {
    switch (mode) {
      case "0": return NAVBAR_PREFIX + "threebutton";
      case "1": return NAVBAR_PREFIX + "twobutton";
      case "2": return NAVBAR_PREFIX + "gestural";
      default: return null;
    }
  }

  /** IC8이 바꾼 내비게이션 모드 · 오버레이를 시작 값으로 되돌리고, 되돌아왔는지 확인한다. 실패는 삼키지 않고 모은다. */
  private void restoreNavigationMode(List<String> failures) {
    if (originalNavigationMode == null || originalNavbarOverlays == null) return;
    String startOverlay = overlayOfMode(originalNavigationMode);
    List<String> order = new ArrayList<>();
    for (Map.Entry<String, Boolean> entry : originalNavbarOverlays.entrySet()) {
      if (!entry.getValue()) restoreStep(failures, "cmd overlay disable " + entry.getKey());
      else if (!entry.getKey().equals(startOverlay)) order.add(entry.getKey());
    }
    if (startOverlay != null && Boolean.TRUE.equals(originalNavbarOverlays.get(startOverlay))) order.add(startOverlay);
    for (String overlay : order) restoreStep(failures, "cmd overlay enable " + overlay);
    boolean modeBack =
        await(CHANGE_TIMEOUT_MS, () -> shell("settings get secure navigation_mode").equals(originalNavigationMode));
    if (!modeBack) {
      failures.add(
          "navigation_mode is " + shell("settings get secure navigation_mode") + ", expected " + originalNavigationMode
              + " (overlays at start: " + originalNavbarOverlays + ")");
    }
    Map<String, Boolean> now = navbarOverlays();
    if (!now.equals(originalNavbarOverlays)) {
      failures.add("navbar overlays are " + now + ", expected " + originalNavbarOverlays);
    }
    originalNavigationMode = null;
    originalNavbarOverlays = null;
  }

  private void expectValue(List<String> failures, String command, String expected) {
    String actual = shell(command);
    if (!actual.equals(expected)) failures.add("`" + command + "` was " + actual + ", expected " + expected);
  }

  // ---- 케이스 --------------------------------------------------------------

  /** IC1: 설치된 앱의 병합 매니페스트. */
  @Test public void ic1_installedManifestDeclaresPortraitAndHandledConfigChanges() throws Exception {
    ActivityInfo info =
        instrumentation
            .getTargetContext()
            .getPackageManager()
            .getActivityInfo(new ComponentName(instrumentation.getTargetContext(), MainActivity.class), 0);
    assertEquals(
        "screenOrientation must be SCREEN_ORIENTATION_PORTRAIT",
        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT,
        info.screenOrientation);
    assertEquals(
        "configChanges must contain all 11 handled values (0x80002ff4, incl. assetsPaths); was 0x" + Integer.toHexString(info.configChanges),
        HANDLED,
        info.configChanges & HANDLED);
    assertEquals(
        "configChanges must not declare density, fontScale or resourcesUnused (never declared); was 0x"
            + Integer.toHexString(info.configChanges),
        0,
        info.configChanges
            & (ActivityInfo.CONFIG_DENSITY
                | ActivityInfo.CONFIG_FONT_SCALE
                | ActivityInfo.CONFIG_RESOURCES_UNUSED));
  }

  /** IC2: 다크 모드 전환(uiMode)은 재생성 없이 받는다. */
  @Test public void ic2_nightModeSwitchKeepsTheSameInstance() {
    Host host = launch();
    advanceOnboarding(host);
    shell("cmd uimode night yes");
    awaitDelivered(host, "night mode", () -> isNight(host.activity.getResources().getConfiguration()));
    assertSameInstance(host, "night mode yes");
    assertScreenStatePreserved(host, "night mode yes");
  }

  /** IC3: 화면 높이 변화 — 같은 인스턴스 · LynxView가 창을 따라감 · screen metrics가 Lynx에 전달됨. */
  @Test public void ic3_displaySizeChangeKeepsInstanceAndLynxFollowsTheWindow() {
    Host host = launch();
    Assume.assumeTrue(
        "device is a large screen (sw >= 600dp); this case needs a phone-sized display",
        host.configuration.smallestScreenWidthDp < 600);
    String physical = shell("wm size");
    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Physical size: (\\d+)x(\\d+)").matcher(physical);
    assertTrue("precondition: cannot read the physical size from `wm size`: " + physical, matcher.find());
    int width = Integer.parseInt(matcher.group(1));
    int physicalHeight = Integer.parseInt(matcher.group(2));
    advanceOnboarding(host);
    int rootHeightBefore = rootHeight(host);
    int targetHeight = 1920;
    assertTrue(
        "precondition: physical height " + physicalHeight + " must exceed " + targetHeight + " to shrink it",
        physicalHeight > targetHeight);

    shell("wm size " + width + "x" + targetHeight);
    awaitDelivered(
        host,
        "display size change",
        () -> host.activity.getResources().getConfiguration().screenHeightDp < host.configuration.screenHeightDp);
    assertSameInstance(host, "wm size " + width + "x" + targetHeight);

    View decor = host.activity.getWindow().getDecorView();
    assertTrue(
        "LynxView did not re-layout to the new window: lynx="
            + host.lynxView.getWidth() + "x" + host.lynxView.getHeight()
            + " decor=" + decor.getWidth() + "x" + decor.getHeight()
            + " (was decor height " + host.decorHeight + ")",
        await(
            CHANGE_TIMEOUT_MS,
            () ->
                decor.getHeight() < host.decorHeight
                    && host.lynxView.getWidth() == decor.getWidth()
                    && host.lynxView.getHeight() == decor.getHeight()));

    assertScreenStatePreserved(host, "wm size " + width + "x" + targetHeight);
    // 더 강한 신호: 페이지 안의 레이아웃이 새 창 높이로 다시 잡혔다(루트 UI 높이가 줄고, 버튼이 새 창 안에 있다).
    assertTrue(
        "page content did not re-layout to the new window height: root UI height " + rootHeight(host)
            + " (was " + rootHeightBefore + "), '" + BACK + "' rect " + rectOf(host, BACK)
            + ", window height " + decor.getHeight(),
        await(
            CHANGE_TIMEOUT_MS,
            () -> {
              Rect back = rectOf(host, BACK);
              int root = rootHeight(host);
              return back != null
                  && root < rootHeightBefore
                  && root <= decor.getHeight()
                  && back.bottom <= decor.getHeight();
            }));

    AtomicReference<DisplayMetrics> metrics = new AtomicReference<>();
    boolean forwarded =
        await(
            CHANGE_TIMEOUT_MS,
            () -> {
              metrics.set(onMain(() -> host.lynxView.getLynxContext().getScreenMetrics()));
              DisplayMetrics now = metrics.get();
              return now != null && now.widthPixels == width && now.heightPixels == targetHeight;
            });
    DisplayMetrics last = metrics.get();
    assertTrue(
        "Lynx screen metrics were not updated to the new display (expected "
            + width + "x" + targetHeight + ", got "
            + (last == null ? "null" : last.widthPixels + "x" + last.heightPixels) + ")",
        forwarded);
  }

  /** IC4: 휴대폰에서 기기를 돌려도 세로 그대로이고 재생성이 없다. */
  @Test public void ic4_rotationOnAPhoneStaysPortraitAndKeepsTheInstance() {
    Host host = launch();
    Assume.assumeTrue(
        "device is a large screen (sw >= 600dp); the portrait lock may be ignored there",
        host.configuration.smallestScreenWidthDp < 600);
    advanceOnboarding(host);

    assertTrue("UiAutomation.setRotation was rejected", automation().setRotation(UiAutomation.ROTATION_FREEZE_90));
    // 회전 요청이 플랫폼에 받아들여졌는지 먼저 본다 — 요청이 안 갔는데 「세로 유지」로 통과하지 않게.
    assertTrue(
        "the 90 degree rotation request was not accepted by the platform (user_rotation never became 1)",
        await(CHANGE_TIMEOUT_MS, () -> shell("settings get system user_rotation").equals("1")));

    assertSameInstance(host, "rotate 90");
    assertEquals(
        "orientation must stay PORTRAIT after rotating a phone",
        Configuration.ORIENTATION_PORTRAIT,
        host.activity.getResources().getConfiguration().orientation);
    assertScreenStatePreserved(host, "rotate 90");
  }

  /** IC5: 큰 화면 흉내 — 고정이 무시돼 가로가 되어도 같은 인스턴스 · LynxView가 가로로 다시 배치. */
  @Test public void ic5_largeScreenLandscapeKeepsTheInstance() {
    Assume.assumeTrue("the orientation lock is only ignored on API 36+", Build.VERSION.SDK_INT >= 36);
    Host host = launch();
    advanceOnboarding(host);

    shell("wm size 1600x2560");
    shell("wm set-ignore-orientation-request true");
    awaitDelivered(
        host,
        "large-screen size (1600x2560 @ current density)",
        () -> host.activity.getResources().getConfiguration().smallestScreenWidthDp >= 600);
    assertTrue("UiAutomation.setRotation was rejected", automation().setRotation(UiAutomation.ROTATION_FREEZE_90));

    boolean landscape =
        await(
            CHANGE_TIMEOUT_MS,
            () -> {
              MainActivity current = latest.get();
              return current != null
                  && current.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
            });
    // 가로가 되지 않았다면 이 흉내로는 판정할 수 없다 — 통과로 세지 않고 건너뛴다(계약 §14-2).
    Assume.assumeTrue(
        "rotation did not produce landscape on the emulated large screen (sw="
            + host.activity.getResources().getConfiguration().smallestScreenWidthDp
            + "dp) — cannot judge; do not count this as a pass",
        landscape);

    assertSameInstance(host, "landscape on a large screen");
    assertEquals(
        Configuration.ORIENTATION_LANDSCAPE,
        host.activity.getResources().getConfiguration().orientation);
    assertTrue(
        "LynxView did not re-layout to landscape: " + host.lynxView.getWidth() + "x" + host.lynxView.getHeight(),
        await(CHANGE_TIMEOUT_MS, () -> host.lynxView.getWidth() > host.lynxView.getHeight()));
    assertScreenStatePreserved(host, "landscape on a large screen");
  }

  /** IC6: 글꼴 배율은 재생성을 받아들인다(가드). */
  @Test public void ic6_fontScaleChangeRecreatesTheActivity() {
    Host host = launch();
    shell("settings put system font_scale 1.3");
    MainActivity fresh = awaitRecreated(host, "font_scale 1.3");
    assertTrue(
        "recreated MainActivity must carry fontScale 1.3, was " + fresh.getResources().getConfiguration().fontScale,
        await(CHANGE_TIMEOUT_MS, () -> Math.abs(fresh.getResources().getConfiguration().fontScale - 1.3f) < 0.01f));
  }

  /** IC7: 밀도는 재생성을 받아들인다(가드). */
  @Test public void ic7_densityChangeRecreatesTheActivity() {
    Host host = launch();
    shell("wm density 480");
    MainActivity fresh = awaitRecreated(host, "wm density 480");
    assertTrue(
        "recreated MainActivity must carry densityDpi 480, was " + fresh.getResources().getConfiguration().densityDpi,
        await(CHANGE_TIMEOUT_MS, () -> fresh.getResources().getConfiguration().densityDpi == 480));
  }

  private int tappableBottomInset(Host host) {
    return onMain(
        () -> {
          WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(host.activity.getWindow().getDecorView());
          return insets == null ? -1 : insets.getInsets(WindowInsetsCompat.Type.tappableElement()).bottom;
        });
  }

  /**
   * IC8: 런타임 리소스 오버레이 전환(내비게이션 모드 — assetsPaths)은 재생성 없이 받는다. API 36+만 — API 30에서는
   * 선언해도 재생성되는 것이 실측됐다(spec r02-2). 전환이 실제로 일어났는지(navigation_mode 값이 바뀌고 탭 가능 inset이
   * 갱신됐는지)를 먼저 보고, 안 일어났으면 통과가 아니라 실패다. 3버튼 <-> 제스처를 한 번 왕복한다(두 번 모두 같은 인스턴스).
   * 시작 모드 · 오버레이 상태는 {@link #restore()}가 되돌린다.
   */
  @Test public void ic8_overlayNavigationModeSwitchKeepsTheSameInstance() {
    Assume.assumeTrue(
        "assetsPaths in configChanges is only honored on API 36+ (API 30 recreates despite the declaration)",
        Build.VERSION.SDK_INT >= 36);
    Host host = launch();
    advanceOnboarding(host);

    String startMode = shell("settings get secure navigation_mode");
    Assume.assumeTrue(
        "navigation_mode starts as " + startMode + " — this case switches between 3-button (0) and gesture (2)",
        startMode.equals("0") || startMode.equals("2"));
    String startCategory = startMode.equals("0") ? "threebutton" : "gestural";
    String otherMode = startMode.equals("0") ? "2" : "0";
    String otherCategory = startMode.equals("0") ? "gestural" : "threebutton";
    // 되돌릴 값을 먼저 기록한다 — 이 뒤로는 @After가 반드시 되돌린다.
    originalNavigationMode = startMode;
    originalNavbarOverlays = navbarOverlays();
    assertTrue(
        "precondition: cannot read the navbar overlays from `cmd overlay list` (" + originalNavbarOverlays + ")",
        originalNavbarOverlays.containsKey(NAVBAR_PREFIX + otherCategory)
            && originalNavbarOverlays.containsKey(NAVBAR_PREFIX + startCategory));

    String[][] steps = {{otherMode, otherCategory}, {startMode, startCategory}};
    for (String[] step : steps) {
      String targetMode = step[0];
      String change = "navigation mode -> " + step[1];
      int insetBefore = tappableBottomInset(host);
      assertTrue("precondition: no window insets yet", insetBefore >= 0);
      assertNotNull(
          "precondition: '" + BACK + "' is not in the Lynx UI tree before " + change, rectOf(host, BACK));

      String output = shell("cmd overlay enable-exclusive --category " + NAVBAR_PREFIX + step[1]);
      assertFalse(
          change + ": the overlay command failed: " + output,
          output.contains("Error") || output.contains("Exception"));
      // 전환이 실제로 일어났는가 — 안 일어났으면 「재생성 없음」으로 통과하지 않는다.
      assertTrue(
          change + ": navigation_mode never became " + targetMode + " (is "
              + shell("settings get secure navigation_mode") + ") — the switch did not happen, cannot judge",
          await(CHANGE_TIMEOUT_MS, () -> shell("settings get secure navigation_mode").equals(targetMode)));
      awaitDelivered(host, change, () -> tappableBottomInset(host) != insetBefore);
      assertSameInstance(host, change);
      assertTrue(
          change + ": the window's tappable bottom inset did not change from " + insetBefore + " (still "
              + tappableBottomInset(host) + ") — the switch was not delivered to the activity",
          tappableBottomInset(host) != insetBefore);
      assertScreenStatePreserved(host, change);
      // 화면이 새 창 안에 그대로 서 있다. 「Back」이 inset을 따라 움직이는지는 앱 레이아웃에 달려 있어 단언하지 않는다.
      View decor = host.activity.getWindow().getDecorView();
      Rect backAfter = rectOf(host, BACK);
      assertNotNull(change + ": '" + BACK + "' disappeared from the Lynx UI tree", backAfter);
      assertTrue(
          change + ": '" + BACK + "' is outside the window: " + backAfter + " (window height " + decor.getHeight() + ")",
          backAfter.bottom <= decor.getHeight());
    }
  }
}
