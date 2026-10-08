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
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsetsController;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.jsbridge.network.HttpRequest;
import com.lynx.jsbridge.network.HttpResponse;
import com.lynx.jsbridge.network.HttpStreamingDelegate;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.LynxViewClient;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import com.lynx.tasm.service.ILynxHttpService;
import com.lynx.tasm.service.LynxHttpRequestCallback;
import com.lynx.tasm.service.LynxServiceCenter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
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
 * android-status-bar-appearance integration HI1~HI8 (계약 spec.md §3.3~§3.6 · r02 · r04.2, 계획 test-plan.md).
 *
 * <p>실제 {@link MainActivity}를 띄워 호스트가 Lynx 트리의 {@code data-statusbar} 표지를 읽고 창의 상태바
 * 아이콘 명암을 바꾸는지 본다. 보는 것은 셋뿐이다 — 창의 외형 플래그({@code isAppearanceLightStatusBars}:
 * <b>켜짐이 어두운 아이콘</b>, 꺼짐이 밝은 아이콘), {@code StatusBarIconSync.applyCount()}, LynxView 트리의 dataset.
 * 시스템이 그린 상태바의 픽셀(대비)은 계측으로 볼 수 없다 — e2e(docs/e2e/android-status-bar-icons.md)의 몫이다.
 *
 * <p><b>계측으로 닿는 화면</b>(세션을 심고 모의 HTTP로 여정 맵까지): 온보딩(HI1, 세션 없음) · 여정 맵 · 표지
 * {@code episode-intro}(D1) · 첫 서사 {@code episode-prologue}(D2) · 지표 모달(D6, 연속 학습).
 * <b>이 테스트가 닿지 않는 화면</b>: 첫 단원 안내(D7 · M2 ~ M4 — 이 테스트의 모의 HTTP는 진행 불러오기에 404를 줘서
 * {@code hasLoadedProgress}가 서지 않는다) · {@code journey-entry}(D5, 로그인을 지나야 한다) · 최종 테스트 ·
 * {@code visual-novel}(D3 · D4, 진행 시드가 없어 잠겨 있다). 진행 옵션(loadProgress · visualNovelProgress ·
 * finalProgress 등)은 {@code SignedInScreenFixtureTest}에만 있고 이 테스트는 읽지 않는다(읽는 인자는 bundleUrl뿐이다).
 * 그 옵션으로 e2e 절차가 닿는 화면이다 — 이 화면들의 증거는 vitest(UT · IS)와 e2e 절차의 몫이다.
 * 서사 → 채팅 같은 「어두움 → 밝음」 전환은 진행 옵션 없이도 서사를 끝까지 넘기면 서지만(e2e 절차가 옵션 없이 닿는다)
 * 이 테스트는 서사를 첫 장면 너머로 넘기지 않는다 — HI5는 어두움 → 어두움(표지 → 서사)만 세고, HI8이 세는 명암 변화는
 * 맵 → 표지 → 맵 · 맵 → 지표 모달 → 맵뿐이다.
 *
 * <p>전제는 스스로 확인한다. 빠지면 이유를 적고 실패한다: {@code -e bundleUrl http://10.0.2.2:&lt;port&gt;/main.lynx.bundle}
 * (번들 서버 필요 · 모의 값으로 만든 번들), 시작 때 야간 모드 {@code no}. 번들이 실제로 로드되지 않으면(온보딩의
 * 「Next」 · 여정 맵 {@code journey-map-screen}이 상한 안에 서지 않으면) 「번들이 로드되지 않았다」로 실패한다.
 * 기기에 이미 남은 앱 상태 때문에 표지 항목이 보이지 않으면 그 이유를 적고 실패한다 — 통과로 세지 않는다.
 *
 * <p>실행 (기기마다, API 37 {@code emulator-5554} · API 30 {@code R6_API30} 둘 다):
 *
 * <pre>
 * PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
 * python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist &amp;
 * cd apps/android &amp;&amp; ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
 * adb -s &lt;device&gt; install -r -t app/build/outputs/apk/debug/app-debug.apk
 * adb -s &lt;device&gt; install -r -t app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
 * adb -s &lt;device&gt; shell am instrument -w -r -e class com.libitum.host.StatusBarIconsHostTest \
 *   -e bundleUrl http://10.0.2.2:18790/main.lynx.bundle \
 *   libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
 * </pre>
 *
 * 종료 코드로 판정하지 않는다 — 출력의 {@code OK (N tests)} 또는 케이스별 {@code INSTRUMENTATION_STATUS_CODE}로 본다.
 * HI4의 야간 모드 명령({@code cmd uimode night})은 API 29부터라 그 아래에서는 {@code Assume}으로 건너뛴다 —
 * {@code INSTRUMENTATION_STATUS_CODE: -4}로만 보이고 {@code OK (8 tests)}에는 섞여 보인다(통과로 세지 않는다).
 *
 * <p><b>전역 기기 상태를 바꾼다</b>: HI4가 시스템 야간 모드를 켠다. 앱 저장소({@code duru-storage})도 백업하고
 * 세션을 심거나 비운다. {@code @After}가 되돌리고, 되돌리지 못하면 삼키지 않고 실패로 적는다. 러너가 중간에 죽으면
 * 남으므로 수동 원복:
 *
 * <pre>
 * adb -s &lt;device&gt; shell 'cmd uimode night no'
 * adb -s &lt;device&gt; shell pm clear libitum.duru.android   # 앱 저장소가 비거나 세션이 남았을 때(개발용 기기에서만)
 * </pre>
 *
 * Maestro · 다른 계측 · e2e와 동시에 돌리지 않는다. 세션 · 모의 HTTP는 {@code SignedInScreenFixtureTest}와 같다 —
 * 실제 서버로 요청이 나가지 않는다.
 */
@RunWith(AndroidJUnit4.class)
public final class StatusBarIconsHostTest {
  private static final String TAG = "StatusBarIconsHostTest";
  private static final String LIGHT_ICONS = "light-icons";
  private static final String DATASET_KEY = "statusbar";
  private static final String REFRESH_URL =
      "https://example.invalid/auth/v1/token?grant_type=refresh_token";
  /** JS 쪽 키 — 저장소의 실제 키(접두어 포함)는 StorageModule만 안다. SignedInScreenFixtureTest와 같은 값. */
  private static final String SESSION_KEY = "libitum.auth.session";
  private static final String SESSION_JSON =
      "{\"accessToken\":\"fixture-access\",\"refreshToken\":\"fixture-seed\",\"expiresAt\":1}";
  private static final long LOAD_TIMEOUT_MS = 20000;
  private static final long STEP_TIMEOUT_MS = 8000;
  /** 「바뀌지 않는다」를 보는 상한. 바뀌면 바로 끝난다. */
  private static final long STABLE_WINDOW_MS = 1200;
  private static final long RECREATE_TIMEOUT_MS = 10000;
  private static final int SYNC_RUNS = 200;
  private static final long SYNC_BUDGET_MICROS = 4000;
  /** HI8: 맵 → 표지 → 맵 → 지표 모달 → 맵. 명암이 바뀌는 전환이 넷이다. */
  private static final int HI8_MIN_TONE_CHANGES = 4;

  private static final String TUTORIAL_INTRO_ITEM = "ui-lynx-learning-unit-tutorial-intro";
  private static final String INTRO_SCREEN = "episode-intro-screen";
  // 아래 셋은 testid 상자(episode-intro-screen-next · -back · journey-stat-modal-back)가 평탄화돼 트리에 없어
  // 단추의 접근성 이름으로 누른다(tap이 testid → 이름 순으로 찾는다).
  private static final String INTRO_NEXT = "Next";
  private static final String INTRO_BACK = "Back to map";
  private static final String NARRATIVE_SCREEN = "episode-narrative-screen";
  private static final String MAP_SCREEN = "journey-map-screen";
  private static final String STREAK_CHIP = "top-bar-streak";
  private static final String STREAK_MODAL = "journey-stat-modal-streak";
  private static final String STREAK_MODAL_BACK = "Back to map";
  private static final String ONBOARDING_NEXT = "Next";

  private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
  private final List<MainActivity> live = new CopyOnWriteArrayList<>();
  private final AtomicInteger created = new AtomicInteger();
  private final AtomicInteger resumed = new AtomicInteger();
  private final AtomicInteger stopped = new AtomicInteger();
  private final AtomicReference<MainActivity> latest = new AtomicReference<>();
  private Application.ActivityLifecycleCallbacks callbacks;
  private boolean started;
  private boolean nightTouched;
  private Map<String, ?> savedStorage;
  private String bundleUrl;

  // ---- 모의 HTTP (SignedInScreenFixtureTest와 같다: 갱신 요청만 200, 나머지 404) -------------

  private static final class FixtureHttp implements ILynxHttpService {
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
          ? "{\"access_token\":\"fixture-access\",\"refresh_token\":\"fixture-refresh\","
              + "\"expires_in\":3600}"
          : "{}";
      response.setHttpBody(body.getBytes(StandardCharsets.UTF_8));
      callback.invoke(response);
    }

    @Override public void requestStreaming(
        HttpRequest request, LynxHttpRequestCallback callback, HttpStreamingDelegate delegate) {
      request(request, callback);
    }
  }

  // ---- 도구 ----------------------------------------------------------------

  private UiAutomation automation() {
    return instrumentation.getUiAutomation();
  }

  private String shell(String command) {
    try (InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(
            automation().executeShellCommand(command));
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
    instrumentation.runOnMainSync(() -> {
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
    Application application =
        (Application) instrumentation.getTargetContext().getApplicationContext();
    callbacks = new Application.ActivityLifecycleCallbacks() {
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

      @Override public void onActivityResumed(Activity activity) {
        if (activity instanceof MainActivity) resumed.incrementAndGet();
      }

      @Override public void onActivityStopped(Activity activity) {
        if (activity instanceof MainActivity) stopped.incrementAndGet();
      }

      @Override public void onActivityStarted(Activity activity) {}

      @Override public void onActivityPaused(Activity activity) {}

      @Override public void onActivitySaveInstanceState(Activity activity, Bundle state) {}
    };
    application.registerActivityLifecycleCallbacks(callbacks);
  }

  private SharedPreferences storage() {
    return instrumentation.getTargetContext()
        .getSharedPreferences("duru-storage", Context.MODE_PRIVATE);
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

  // ---- 창 · 트리 관찰 -----------------------------------------------------------

  /**
   * 상태바 「밝은 바」 플래그(켜짐 = 어두운 아이콘). 창이 아직 컨트롤러를 주지 않으면 null — 호출한 쪽이
   * 관찰할 수 있을 때까지 기다린다(관찰하지 못한 것을 통과로 세지 않는다).
   */
  private Boolean lightBar(Activity activity, boolean navigation) {
    return onMain(() -> {
      Window window = activity.getWindow();
      if (Build.VERSION.SDK_INT >= 30) {
        WindowInsetsController controller = window.getInsetsController();
        if (controller == null) return null;
        int mask = navigation
            ? WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            : WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS;
        return (controller.getSystemBarsAppearance() & mask) != 0;
      }
      @SuppressWarnings("deprecation")
      int visibility = window.getDecorView().getSystemUiVisibility();
      int flag = navigation
          ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
          : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
      return (visibility & flag) != 0;
    });
  }

  // ---- HI8: onPageUpdate 콜 안의 관찰 ---------------------------------------------

  /**
   * 호스트의 클라이언트 <b>뒤에</b> 더해져 그 뒤에 불리는 {@link LynxViewClient}(Lynx는 클라이언트를
   * {@code CopyOnWriteArrayList}에 더한 순서대로 같은 스레드에서 부른다 — LynxViewClientGroup.onPageUpdate).
   * 콜 안에서 트리의 표지로 낸 명암과 창의 플래그를 그 자리에서(대기 · post 없이) 견준다.
   */
  private static final class PageUpdateProbe extends LynxViewClient {
    private final LynxView view;
    private final Window window;
    final AtomicInteger calls = new AtomicInteger();
    final AtomicInteger offMainCalls = new AtomicInteger();
    final AtomicInteger unobservable = new AtomicInteger();
    final AtomicInteger mismatched = new AtomicInteger();
    final AtomicInteger toneChanges = new AtomicInteger();
    final List<String> mismatches = new CopyOnWriteArrayList<>();
    private Boolean previousExpectedDark;

    PageUpdateProbe(LynxView view, Window window) {
      this.view = view;
      this.window = window;
    }

    @Override public void onPageUpdate() {
      calls.incrementAndGet();
      if (Looper.myLooper() != Looper.getMainLooper()) {
        offMainCalls.incrementAndGet();
        return;
      }
      // 호스트와 독립으로 센다: 표지가 하나라도 있으면 밝은 아이콘(플래그 꺼짐).
      boolean expectedDark = markerCount(view.getLynxUIRoot(), new int[1]) == 0;
      Boolean actualDark = statusFlagNow(window);
      if (actualDark == null) {
        unobservable.incrementAndGet();
        return;
      }
      if (previousExpectedDark != null && previousExpectedDark != expectedDark) {
        toneChanges.incrementAndGet();
      }
      previousExpectedDark = expectedDark;
      if (expectedDark != actualDark) {
        mismatched.incrementAndGet();
        mismatches.add("call " + calls.get() + ": tree says " + (expectedDark ? "dark" : "light")
            + " icons, window flag says " + (actualDark ? "dark" : "light"));
      }
    }
  }

  /** 호출한 스레드(메인)에서 바로 읽는 상태바 「밝은 바」 플래그. 관찰할 수 없으면 null. */
  private static Boolean statusFlagNow(Window window) {
    if (Build.VERSION.SDK_INT >= 30) {
      WindowInsetsController controller = window.getInsetsController();
      if (controller == null) return null;
      return (controller.getSystemBarsAppearance()
          & WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS) != 0;
    }
    @SuppressWarnings("deprecation")
    int visibility = window.getDecorView().getSystemUiVisibility();
    return (visibility & View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR) != 0;
  }

  private boolean statusIconsDark(Activity activity) {
    Boolean value = lightBar(activity, false);
    assertNotNull("the window's status bar appearance is not observable yet", value);
    return value;
  }

  /** 상한 안에 상태바 플래그가 {@code dark}(켜짐 = 어두운 아이콘)가 되는가. 관찰 불가는 거짓이다. */
  private boolean awaitStatusIconsDark(Activity activity, boolean dark, long timeoutMs) {
    return await(timeoutMs, () -> {
      Boolean value = lightBar(activity, false);
      return value != null && value == dark;
    });
  }

  /**
   * 노드의 testid. 화면은 {@code id}로(여정 맵 · 서사 · 모달) 또는 {@code data-testid}로(학습 단위 · 하단 내비게이션
   * · 상단 칩) 붙이므로 둘 다 본다 — {@code data-testid}는 Lynx에서 dataset의 {@code testid}다.
   */
  private static boolean matchesTestId(LynxBaseUI node, String testId) {
    if (testId.equals(node.getTestID()) || testId.equals(node.getIdSelector())) return true;
    ReadableMap dataset = node.getDataset();
    if (dataset == null || !dataset.hasKey("testid")) return false;
    try {
      return testId.equals(dataset.getString("testid"));
    } catch (RuntimeException notAString) {
      return false;
    }
  }

  private static LynxBaseUI findByTestId(LynxBaseUI node, String testId) {
    if (node == null) return null;
    if (matchesTestId(node, testId)) return node;
    List<LynxBaseUI> children = node.getChildren();
    if (children != null) {
      for (LynxBaseUI child : children) {
        LynxBaseUI found = findByTestId(child, testId);
        if (found != null) return found;
      }
    }
    return null;
  }

  private static LynxBaseUI findByLabel(LynxBaseUI node, String label) {
    if (node == null) return null;
    CharSequence description = node.getAccessibilityLabel();
    if (description != null && label.contentEquals(description)) return node;
    List<LynxBaseUI> children = node.getChildren();
    if (children != null) {
      for (LynxBaseUI child : children) {
        LynxBaseUI found = findByLabel(child, label);
        if (found != null) return found;
      }
    }
    return null;
  }

  /** 호스트 구현과 독립으로 센다: dataset의 statusbar가 light-icons인 노드 수. 노드 수는 {@code total[0]}에 더한다. */
  private static int markerCount(LynxBaseUI node, int[] total) {
    if (node == null) return 0;
    total[0] += 1;
    int count = 0;
    ReadableMap dataset = node.getDataset();
    if (dataset != null && dataset.hasKey(DATASET_KEY)) {
      try {
        if (LIGHT_ICONS.equals(dataset.getString(DATASET_KEY))) count += 1;
      } catch (RuntimeException notAString) {
        // 문자열이 아닌 값은 표지가 아니다.
      }
    }
    List<LynxBaseUI> children = node.getChildren();
    if (children != null) {
      for (LynxBaseUI child : children) count += markerCount(child, total);
    }
    return count;
  }

  private LynxView lynxViewOf(Activity activity) {
    return onMain(() -> {
      ViewGroup content = activity.findViewById(android.R.id.content);
      View first = content == null ? null : content.getChildAt(0);
      return first instanceof LynxView ? (LynxView) first : null;
    });
  }

  private MainActivity current() {
    MainActivity activity = latest.get();
    assertNotNull("no MainActivity was created", activity);
    return activity;
  }

  private static void collectTestIds(LynxBaseUI node, List<String> out) {
    if (node == null) return;
    String id = node.getTestID();
    if (id == null || id.isEmpty()) id = node.getIdSelector();
    if (id != null && !id.isEmpty()) out.add(id);
    ReadableMap dataset = node.getDataset();
    if (dataset != null && dataset.hasKey("testid")) {
      try {
        out.add("data:" + dataset.getString("testid"));
      } catch (RuntimeException notAString) {
        // 문자열이 아닌 값은 건너뛴다.
      }
    }
    List<LynxBaseUI> children = node.getChildren();
    if (children != null) {
      for (LynxBaseUI child : children) collectTestIds(child, out);
    }
  }

  /** 실패 진단용: 지금 트리에 있는 testid들. */
  private String testIdsOnScreen() {
    LynxView view = lynxViewOf(current());
    if (view == null) return "(no LynxView)";
    return onMain(() -> {
      List<String> ids = new ArrayList<>();
      collectTestIds(view.getLynxUIRoot(), ids);
      return ids.toString();
    });
  }

  private boolean hasTestId(String testId) {
    MainActivity activity = current();
    LynxView view = lynxViewOf(activity);
    if (view == null) return false;
    return onMain(() -> findByTestId(view.getLynxUIRoot(), testId) != null);
  }

  private boolean hasLabel(String label) {
    MainActivity activity = current();
    LynxView view = lynxViewOf(activity);
    if (view == null) return false;
    return onMain(() -> findByLabel(view.getLynxUIRoot(), label) != null);
  }

  private int markers() {
    LynxView view = lynxViewOf(current());
    assertNotNull("content view's first child is not a LynxView", view);
    return onMain(() -> markerCount(view.getLynxUIRoot(), new int[1]));
  }

  private void awaitScreen(String testId, String why) {
    assertTrue(why + " (no '" + testId + "' in the Lynx UI tree within " + STEP_TIMEOUT_MS + " ms)",
        await(STEP_TIMEOUT_MS, () -> hasTestId(testId)));
  }

  private void awaitGone(String testId, String why) {
    assertTrue(why + " ('" + testId + "' is still in the Lynx UI tree after " + STEP_TIMEOUT_MS + " ms)",
        await(STEP_TIMEOUT_MS, () -> !hasTestId(testId)));
  }

  /** testid가 가리키는 노드의 가운데를 탭한다. 노드가 없거나 창 밖이면 이유를 적고 실패한다. */
  private void tap(String testId) {
    MainActivity activity = current();
    LynxView view = lynxViewOf(activity);
    assertNotNull("content view's first child is not a LynxView", view);
    Rect rect = onMain(() -> {
      LynxBaseUI ui = findByTestId(view.getLynxUIRoot(), testId);
      // 단추를 감싼 {@code data-testid} 상자는 Lynx가 평탄화해 트리에 없다 — 단추 자체의 접근성 이름으로 찾는다.
      if (ui == null) ui = findByLabel(view.getLynxUIRoot(), testId);
      return ui == null ? null : new Rect(ui.getRectToWindow());
    });
    assertNotNull("precondition: '" + testId + "' is not in the Lynx UI tree to tap", rect);
    int windowHeight = onMain(() -> activity.getWindow().getDecorView().getHeight());
    assertTrue(
        "precondition: '" + testId + "' is outside the window (" + rect + ", window height "
            + windowHeight + ") — the screen is scrolled or in another state than the fixture's",
        !rect.isEmpty() && rect.centerY() > 0 && rect.centerY() < windowHeight);
    long down = SystemClock.uptimeMillis();
    float x = rect.centerX();
    float y = rect.centerY();
    onMain(() -> activity.dispatchTouchEvent(
        MotionEvent.obtain(down, down, MotionEvent.ACTION_DOWN, x, y, 0)));
    onMain(() -> activity.dispatchTouchEvent(
        MotionEvent.obtain(down, down + 60, MotionEvent.ACTION_UP, x, y, 0)));
  }

  // ---- 시작 · 끝 ------------------------------------------------------------

  private void requireBundleUrl() {
    bundleUrl = InstrumentationRegistry.getArguments().getString("bundleUrl");
    assertNotNull(
        "precondition: instrumentation argument bundleUrl is missing — pass "
            + "-e bundleUrl http://10.0.2.2:<port>/main.lynx.bundle (serve the bundle first)",
        bundleUrl);
  }

  private void requireNightModeOff() {
    String night = shell("cmd uimode night").replace("Night mode:", "").trim();
    assertEquals(
        "precondition: system night mode must start as 'no' — run the restore command in the class comment",
        "no", night);
  }

  /** @param signedIn 참이면 세션을 심고 여정 맵까지, 거짓이면 저장소를 비워 첫 실행 온보딩까지 기다린다. */
  private MainActivity launch(boolean signedIn) {
    requireBundleUrl();
    started = true;
    SharedPreferences storage = storage();
    savedStorage = new HashMap<>(storage.getAll());
    // 어느 쪽이든 남은 앱 상태 없이 시작한다(백업은 위에서 떴고 @After가 되돌린다).
    assertTrue("precondition: could not clear the app storage", storage.edit().clear().commit());
    if (signedIn) {
      // 앱과 같은 경로(StorageModule)로 심는다 — 저장 키 접두어를 테스트가 복제하지 않는다.
      new StorageModule(instrumentation.getTargetContext()).set(SESSION_KEY, SESSION_JSON);
      assertEquals("precondition: the fixture session was not stored", SESSION_JSON,
          new StorageModule(instrumentation.getTargetContext()).get(SESSION_KEY));
    }
    LynxServiceCenter.inst().registerService(ILynxHttpService.class, new FixtureHttp());
    register();
    Intent launch = new Intent(Intent.ACTION_MAIN);
    launch.setClass(instrumentation.getTargetContext(), MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    launch.putExtra("bundle-url", bundleUrl);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(launch);
    instrumentation.waitForIdleSync();
    assertNotNull("precondition: content view's first child is not a LynxView",
        lynxViewOf(activity));
    assertTrue(
        "precondition: MainActivity window never got focus (device locked or another window in front?)",
        await(STEP_TIMEOUT_MS, () -> activity.getWindow().getDecorView().isAttachedToWindow()
            && activity.hasWindowFocus()));
    String arrival = signedIn ? "journey-map-screen" : "onboarding '" + ONBOARDING_NEXT + "' button";
    assertTrue(
        "번들이 로드되지 않았다: " + bundleUrl + " (no " + arrival + " within " + LOAD_TIMEOUT_MS
            + " ms; the bundle server may be down, or the device's leftover app state is not the "
            + "fixture's — see the class comment)",
        await(LOAD_TIMEOUT_MS,
            () -> signedIn ? hasTestId(MAP_SCREEN) : hasLabel(ONBOARDING_NEXT)));
    return activity;
  }

  /** 여정 맵에서 튜토리얼 표지 항목을 눌러 표지(episode-intro, D1)까지 간다. */
  private void openIntro() {
    assertTrue("precondition: the map must be on screen before opening the cover",
        hasTestId(MAP_SCREEN));
    boolean present = await(STEP_TIMEOUT_MS, () -> hasTestId(TUTORIAL_INTRO_ITEM));
    assertTrue(
        "precondition: the tutorial cover item '" + TUTORIAL_INTRO_ITEM + "' is not on the map — "
            + "the device's app state has the tutorial intro done or the item is not rendered; "
            + "this surface is not reachable by instrumentation then; on screen: " + testIdsOnScreen(),
        present);
    tap(TUTORIAL_INTRO_ITEM);
    awaitScreen(INTRO_SCREEN, "tapping the cover item did not open the cover (episode-intro)");
  }

  @After public void restore() {
    List<String> failures = new ArrayList<>();
    if (started) {
      for (MainActivity activity : new ArrayList<>(live)) {
        try {
          instrumentation.runOnMainSync(activity::finish);
        } catch (RuntimeException error) {
          failures.add("could not finish a MainActivity: " + error);
        }
      }
      if (!await(STEP_TIMEOUT_MS, live::isEmpty)) {
        failures.add("a MainActivity is still alive after finish()");
      }
      if (callbacks != null) {
        ((Application) instrumentation.getTargetContext().getApplicationContext())
            .unregisterActivityLifecycleCallbacks(callbacks);
        callbacks = null;
      }
      restoreStorage(failures);
    }
    if (nightTouched) {
      shell("cmd uimode night no");
      String night = shell("cmd uimode night").replace("Night mode:", "").trim();
      if (!"no".equals(night)) {
        failures.add("night mode was not restored (now '" + night + "') — run: cmd uimode night no");
      }
      nightTouched = false;
    }
    if (!failures.isEmpty()) {
      throw new AssertionError("restore failed: " + failures);
    }
  }

  // ---- 케이스 ----------------------------------------------------------------

  /** HI1: 세션 없이 뜬 온보딩 — 상태바 · 내비게이션 바 플래그가 켜짐(기본값 = 어두운 아이콘). 가드. */
  @Test public void hi1_onboardingWithoutSessionKeepsBothBarsLight() {
    requireNightModeOff();
    MainActivity activity = launch(false);

    assertEquals("onboarding carries no status bar marker", 0, markers());
    assertTrue("status bar flag must stay on (dark icons) on the onboarding",
        statusIconsDark(activity));
    assertTrue("navigation bar flag must be on (dark buttons) on the onboarding",
        lightBar(activity, true));
    assertFalse("status bar flag must not turn off while the onboarding stays",
        awaitStatusIconsDark(activity, false, STABLE_WINDOW_MS));
  }

  /** HI2: 여정 맵 → 표지 — 상태바 플래그 꺼짐(밝은 아이콘), 내비게이션 바는 켜짐, 표지가 정확히 하나. */
  @Test public void hi2_coverTurnsStatusIconsLightAndLeavesNavigationBar() {
    requireNightModeOff();
    MainActivity activity = launch(true);
    assertTrue("precondition: the map starts with dark icons (flag on)", statusIconsDark(activity));
    assertEquals("precondition: the map carries no marker", 0, markers());

    openIntro();

    assertEquals("exactly one node carries dataset statusbar=light-icons on the cover", 1, markers());
    assertTrue("the cover must turn the status bar flag off (light icons)",
        awaitStatusIconsDark(activity, false, STEP_TIMEOUT_MS));
    assertTrue("the navigation bar flag must stay on (dark buttons)", lightBar(activity, true));
  }

  /** HI3: 표지 → 뒤로(맵) 켜짐, 맵에서 연속 칩 → 지표 모달 꺼짐, 닫기 켜짐. */
  @Test public void hi3_leavingTheCoverAndOpeningAStatModalFollowsTheSurface() {
    requireNightModeOff();
    MainActivity activity = launch(true);
    openIntro();
    assertTrue("the cover must turn the status bar flag off (light icons) — the host did not change it",
        awaitStatusIconsDark(activity, false, STEP_TIMEOUT_MS));

    tap(INTRO_BACK);
    awaitGone(INTRO_SCREEN, "back on the cover did not return to the map");
    awaitScreen(MAP_SCREEN, "the map is not on screen after leaving the cover");
    assertEquals("the map carries no marker again", 0, markers());
    assertTrue("back on the map the flag must be on again (dark icons)",
        awaitStatusIconsDark(activity, true, STEP_TIMEOUT_MS));

    tap(STREAK_CHIP);
    awaitScreen(STREAK_MODAL, "tapping the streak chip did not open the stat modal");
    assertEquals("the stat modal carries exactly one marker", 1, markers());
    assertTrue("the stat modal must turn the flag off (light icons)",
        awaitStatusIconsDark(activity, false, STEP_TIMEOUT_MS));

    tap(STREAK_MODAL_BACK);
    awaitGone(STREAK_MODAL, "closing the stat modal did not remove it");
    assertTrue("closing the stat modal must turn the flag on again (dark icons)",
        awaitStatusIconsDark(activity, true, STEP_TIMEOUT_MS));
  }

  /**
   * HI4: 표지가 떠 있는 채 야간 모드 구성 변경 — 같은 인스턴스이고 플래그가 꺼진 채. HOME → 복귀 뒤에도 꺼진 채.
   * 야간 모드 명령은 API 29부터다.
   */
  @Test public void hi4_lightIconsSurviveNightModeSwitchAndHomeReturn() {
    Assume.assumeTrue("cmd uimode night needs API 29+", Build.VERSION.SDK_INT >= 29);
    requireNightModeOff();
    MainActivity activity = launch(true);
    openIntro();
    assertTrue("the cover must turn the status bar flag off (light icons) — the host did not change it",
        awaitStatusIconsDark(activity, false, STEP_TIMEOUT_MS));

    nightTouched = true;
    shell("cmd uimode night yes");
    assertTrue("night mode was not delivered to MainActivity within " + STEP_TIMEOUT_MS + " ms",
        await(STEP_TIMEOUT_MS, () -> created.get() > 1 || (activity.getResources()
            .getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
            == android.content.res.Configuration.UI_MODE_NIGHT_YES));
    assertEquals("night mode must not recreate MainActivity", 1, created.get());
    assertSame("the same MainActivity instance stays", activity, current());
    assertFalse("the activity must not be destroyed by the night mode change",
        activity.isDestroyed());
    assertFalse("the light icons must survive the night mode change (flag stays off)",
        awaitStatusIconsDark(activity, true, STABLE_WINDOW_MS));
    assertTrue("the cover must still be on screen", hasTestId(INTRO_SCREEN));

    int stopsBefore = stopped.get();
    int resumesBefore = resumed.get();
    shell("input keyevent KEYCODE_HOME");
    assertTrue("HOME did not stop MainActivity within " + STEP_TIMEOUT_MS + " ms",
        await(STEP_TIMEOUT_MS, () -> stopped.get() > stopsBefore));
    shell("am start -n " + instrumentation.getTargetContext().getPackageName()
        + "/com.libitum.host.MainActivity");
    assertTrue("returning from HOME did not resume MainActivity within " + STEP_TIMEOUT_MS + " ms",
        await(STEP_TIMEOUT_MS, () -> resumed.get() > resumesBefore));
    assertEquals("returning from HOME must not recreate MainActivity", 1, created.get());
    assertSame("the same MainActivity instance after HOME", activity, current());
    assertTrue("the cover must still be on screen after HOME", hasTestId(INTRO_SCREEN));
    assertFalse("the light icons must survive HOME and return (flag stays off)",
        awaitStatusIconsDark(activity, true, STABLE_WINDOW_MS));
    assertTrue("the status bar flag is off after returning", !statusIconsDark(activity));
  }

  /**
   * HI5: 표지 → Next → 서사(어두움 → 어두움) — 플래그가 꺼진 채이고 적용 횟수가 변하지 않는다. 플래그 단언을
   * 먼저, 횟수 단언을 뒤에 둔다(횟수 단언은 껍데기에서도 통과한다).
   */
  @Test public void hi5_coverToNarrativeKeepsLightIconsWithoutReapplying() {
    requireNightModeOff();
    MainActivity activity = launch(true);
    openIntro();
    assertTrue("the cover must turn the status bar flag off (light icons) — the host did not change it",
        awaitStatusIconsDark(activity, false, STEP_TIMEOUT_MS));
    // 표지의 첫 적용이 끝난 시점의 횟수.
    int before = activity.statusBarIcons.applyCount();

    tap(INTRO_NEXT);
    awaitScreen(NARRATIVE_SCREEN, "Next on the cover did not open the first narrative");
    awaitGone(INTRO_SCREEN, "the cover is still on screen after Next");
    assertEquals("the narrative carries exactly one marker", 1, markers());

    assertFalse("flag must stay off (light icons) across cover -> narrative",
        awaitStatusIconsDark(activity, true, STABLE_WINDOW_MS));
    assertTrue("the status bar flag is off on the narrative", !statusIconsDark(activity));
    assertEquals("dark -> dark replacement must not apply to the window", before,
        activity.statusBarIcons.applyCount());
  }

  /**
   * HI6: 표지가 떠 있는 채 {@code recreate()} — 새 인스턴스는 기본값(켜짐)으로 서고, 맵에서도 켜짐이며,
   * 표지로 다시 가면 꺼진다.
   */
  @Test public void hi6_recreateStartsFromDefaultAndFollowsTheCoverAgain() {
    requireNightModeOff();
    MainActivity old = launch(true);
    openIntro();
    assertTrue("the cover must turn the status bar flag off (light icons) — the host did not change it",
        awaitStatusIconsDark(old, false, STEP_TIMEOUT_MS));

    instrumentation.runOnMainSync(old::recreate);
    assertTrue("MainActivity was not recreated within " + RECREATE_TIMEOUT_MS + " ms",
        await(RECREATE_TIMEOUT_MS, () -> created.get() >= 2 && old.isDestroyed()));
    MainActivity fresh = current();
    assertNotSame("the newest MainActivity is the original instance", old, fresh);
    assertTrue("the new instance's window must be observable",
        await(STEP_TIMEOUT_MS, () -> lightBar(fresh, false) != null));
    assertFalse("the recreated instance starts at the splash/map, not on the cover",
        hasTestId(INTRO_SCREEN));
    assertTrue("the recreated instance must start from the default (flag on, dark icons)",
        statusIconsDark(fresh));

    assertTrue("the recreated instance did not reach the map",
        await(LOAD_TIMEOUT_MS, () -> hasTestId(MAP_SCREEN)));
    assertTrue("the map must have dark icons (flag on)",
        awaitStatusIconsDark(fresh, true, STEP_TIMEOUT_MS));

    openIntro();
    assertTrue("the cover must turn the new instance's flag off again",
        awaitStatusIconsDark(fresh, false, STEP_TIMEOUT_MS));
  }

  /** HI7: 여정 맵에서 {@code sync} 200회의 평균이 4ms 미만(기록: 노드 수 · 평균 µs). */
  @Test public void hi7_syncCostOnTheMapStaysUnderBudget() {
    requireNightModeOff();
    MainActivity activity = launch(true);
    LynxView view = lynxViewOf(activity);
    assertNotNull("content view's first child is not a LynxView", view);
    int[] nodes = new int[1];
    onMain(() -> markerCount(view.getLynxUIRoot(), nodes));
    assertTrue("precondition: the map tree is empty", nodes[0] > 1);

    long[] elapsedNanos = new long[1];
    onMain(() -> {
      long start = System.nanoTime();
      for (int run = 0; run < SYNC_RUNS; run += 1) activity.statusBarIcons.sync(view);
      elapsedNanos[0] = System.nanoTime() - start;
      return null;
    });
    long averageMicros = elapsedNanos[0] / SYNC_RUNS / 1000;
    String record = "sync on the map: nodes=" + nodes[0] + " runs=" + SYNC_RUNS + " average="
        + averageMicros + "us";
    Log.i(TAG, record);
    Bundle status = new Bundle();
    status.putString("hi7", record);
    instrumentation.sendStatus(0, status);
    assertTrue(record + " — the budget is " + SYNC_BUDGET_MICROS + "us",
        averageMicros < SYNC_BUDGET_MICROS);
    assertTrue("the map must still have dark icons after repeated sync", statusIconsDark(activity));
  }

  /**
   * HI8 (기준 A — spec r04.2): 명암이 바뀐 화면 갱신의 {@code onPageUpdate} 콜 <b>안에서</b> 창의 플래그가 이미
   * 맞아 있다. 맵 → 표지 → 뒤로 → 지표 모달 열기 → 닫기 동안 어긋난 콜 0회 · 명암이 바뀐 콜 4회 이상.
   * 폴링 · 대기로 읽지 않는다 — 적용이 {@code post}로 미뤄지면 바뀐 바로 그 콜에서 어긋남이 잡힌다.
   * 전제(Lynx가 더한 순서대로 부른다)가 깨지면 바뀐 콜마다 어긋나 시끄럽게 실패한다.
   */
  @Test public void hi8_flagIsAppliedInsideThePageUpdateCall() {
    requireNightModeOff();
    MainActivity activity = launch(true);
    LynxView view = lynxViewOf(activity);
    assertNotNull("content view's first child is not a LynxView", view);
    PageUpdateProbe probe = new PageUpdateProbe(view, activity.getWindow());
    // 호스트의 클라이언트는 onCreate에서 이미 더해졌다 — 이 클라이언트는 그 뒤에 불린다.
    onMain(() -> {
      view.addLynxViewClient(probe);
      return null;
    });
    assertTrue("precondition: the map starts with dark icons (flag on)", statusIconsDark(activity));

    openIntro();
    assertTrue("the cover must turn the flag off (light icons)",
        awaitStatusIconsDark(activity, false, STEP_TIMEOUT_MS));
    tap(INTRO_BACK);
    awaitGone(INTRO_SCREEN, "back on the cover did not return to the map");
    awaitScreen(MAP_SCREEN, "the map is not on screen after leaving the cover");
    assertTrue("back on the map the flag must be on again (dark icons)",
        awaitStatusIconsDark(activity, true, STEP_TIMEOUT_MS));
    tap(STREAK_CHIP);
    awaitScreen(STREAK_MODAL, "tapping the streak chip did not open the stat modal");
    assertTrue("the stat modal must turn the flag off (light icons)",
        awaitStatusIconsDark(activity, false, STEP_TIMEOUT_MS));
    tap(STREAK_MODAL_BACK);
    awaitGone(STREAK_MODAL, "closing the stat modal did not remove it");
    assertTrue("closing the stat modal must turn the flag on again (dark icons)",
        awaitStatusIconsDark(activity, true, STEP_TIMEOUT_MS));
    onMain(() -> {
      view.removeLynxViewClient(probe);
      return null;
    });

    String record = "onPageUpdate probe: calls=" + probe.calls.get() + " toneChanges="
        + probe.toneChanges.get() + " mismatched=" + probe.mismatched.get() + " unobservable="
        + probe.unobservable.get() + " offMain=" + probe.offMainCalls.get();
    Log.i(TAG, record);
    Bundle status = new Bundle();
    status.putString("hi8", record);
    instrumentation.sendStatus(0, status);
    assertEquals("onPageUpdate must run on the main thread — " + record, 0,
        probe.offMainCalls.get());
    assertTrue("the probe must have seen the tone change in at least " + HI8_MIN_TONE_CHANGES
            + " onPageUpdate calls — " + record,
        probe.toneChanges.get() >= HI8_MIN_TONE_CHANGES);
    assertEquals("the window flag must already match the tree inside the onPageUpdate call — "
            + record + " " + probe.mismatches, 0, probe.mismatched.get());
  }
}
