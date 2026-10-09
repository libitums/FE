package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Application;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.os.Process;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.imagepipeline.core.ImagePipelineFactory;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import com.lynx.tasm.core.LynxThreadPool;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import org.junit.After;
import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * android-splash-wordmark integration HW0~HW6 (계약 spec.md §2 · §5 · r02, 계획 test-plan.md integration).
 *
 * <p>결함: Lynx 4.0.1은 {@code LynxMediaResourceFetcher}가 달려 있으면 UI 스레드에서 들어온 {@code <image src>}의
 * URL 재작성을 {@code lynx-brief-io} 스레드로 넘기고, 같은 속성 갱신이 재작성 전의 {@code /static/…}로 이미지
 * 요청을 먼저 만들 수 있다. 실패한 요청의 {@code binderror}가 스플래시를 3 ~ 283 ms 만에 닫는다. 간헐 결함이라
 * 자연 조건의 반복은 e2e의 몫이고, 이 테스트는 <b>경합을 강제</b>해 결정적으로 본다.
 *
 * <p><b>강제 수단</b>(제품 코드에 이음매를 두지 않는다): 계측은 앱과 같은 프로세스에서 돈다. {@code MainActivity}를
 * 띄우기 <b>전에</b> Lynx의 공개 정적 풀 둘을 래치로 잠재운다.
 *
 * <ul>
 *   <li>brief-io: {@code LynxThreadPool.getBriefIOExecutor()}에 대기 작업을 풀의 스레드 수보다 많이 던진다 —
 *       비동기 재작성이 있으면 여기서 멈춘다.
 *   <li>HIGH: {@code LynxThreadPool.postUIOperationTask(Runnable)}에 대기 작업을 던진다 — 이미지 UI의 비동기
 *       생성이 「not done」이 돼 UI 스레드에서 만들어지고, 이미지 요청 작업도 여기서 기다린다.
 * </ul>
 *
 * 첫 화면이 선 것을 확인한 뒤 HIGH 래치를 풀어 요청 작업이 돌게 한다. brief-io 래치는 그 2 s 뒤에 푼다. 수정 전
 * (재작성이 brief-io로 넘어가는 결선)에는 요청이 재작성 전의 {@code /static/…}로 나가 {@code Unsupported uri
 * scheme}으로 실패하고 스플래시가 닫힌다. 수정 후(동기 {@code ImageInterceptor})에는 재작성이 불린 스레드에서
 * 끝나므로 풀이 잠겨 있어도 요청이 재작성된 URL로 나간다. <b>@After가 두 래치를 반드시 풀고</b> 풀이 실제로 비었는지
 * 확인한다 — 풀은 프로세스에 남으므로 다른 계측 클래스로 새지 않게 한다.
 *
 * <p>판정 신호는 같은 프로세스의 logcat이다({@code logcat -d --pid}, 케이스 시작 시각 이후의 줄만 센다):
 * {@code LynxImageManager: onFailed}, {@code SendCustomEvent event name:finalloopcomplete} · {@code error},
 * {@code LynxTemplateRender: onFirstScreen}, {@code createViewAsync not done, will create on ui thread,
 * tagName:image}(강제가 걸렸다는 표지). 보조로 LynxView 트리의 {@code splash-screen-logo} 노드와 온보딩의 「Next」를
 * 본다.
 *
 * <p>전제는 스스로 확인한다. 빠지면 이유를 적고 <b>실패</b>한다(건너뛰지 않는다): {@code -e bundleUrl
 * http://10.0.2.2:&lt;port&gt;/main.lynx.bundle}(번들 서버 필요 · 모의 값으로 만든 번들). 번들이 로드되지 않으면
 * 「번들이 로드되지 않았다」로 실패한다. HW3만 {@code -e wordmarkMissing true}가 없으면 {@code Assume}으로 건너뛴다
 * ({@code INSTRUMENTATION_STATUS_CODE: -4} — 통과로 세지 않는다).
 *
 * <p>실행 (기기마다, API 37 {@code emulator-5554} · API 30 {@code R6_API30}):
 *
 * <pre>
 * PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
 * python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist &amp;
 * cd apps/android &amp;&amp; ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
 * adb -s &lt;device&gt; install -r -t app/build/outputs/apk/debug/app-debug.apk
 * adb -s &lt;device&gt; install -r -t app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
 * adb -s &lt;device&gt; shell am instrument -w -r -e class com.libitum.host.SplashWordmarkHostTest \
 *   -e bundleUrl http://10.0.2.2:18790/main.lynx.bundle \
 *   libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
 * # HW1만 반복: -e class com.libitum.host.SplashWordmarkHostTest#hw1_forcedRaceKeepsTheWordmarkRequestRewritten
 * # HW3: 워드마크 파일을 지운 서버 사본을 서빙하고 -e wordmarkMissing true 를 더한다
 * </pre>
 *
 * <p><b>HW5 · HW6 (r02 · 가드 — 늦은 도착)</b>: 워드마크 응답만 N ms 늦추는 번들 서버가 필요하다. 저장소의
 * {@code apps/android/tools/wordmark-delay-server.py}가 그것이다(경로에 {@code logo-handwriting}이 들면 응답 전에 N ms
 * 기다리고, 요청마다 시작 · 끝 시각과 상태를 한 줄씩 찍는다).
 *
 * <pre>
 * python3 apps/android/tools/wordmark-delay-server.py apps/mobile/dist 18793 2000 &gt; /tmp/delay-2000.log &amp;
 * adb -s &lt;device&gt; shell am instrument -w -r \
 *   -e class com.libitum.host.SplashWordmarkHostTest#hw5_lateWordmarkStillLetsTheSplashEndAndOnboardingStand \
 *   -e bundleUrl http://10.0.2.2:18793/main.lynx.bundle -e wordmarkDelayMs 2000 \
 *   libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
 * # HW6: 같은 모양으로 서버를 1000 ms 지연으로 띄우고 -e wordmarkDelayMs 1000 (#hw6_wordmarkLateByOneSecondStillPlaysToTheEnd)
 * # HW7(보강): 8000 ms 지연 서버 + -e wordmarkDelayMs 8000 (#hw7_veryLateWordmarkIsEndedBySafetyTimerAlone)
 * </pre>
 *
 * {@code -e wordmarkDelayMs}가 없거나 그 케이스의 값(HW5 = 2000 · HW6 = 1000 · HW7 = 8000)이 아니면 {@code Assume}으로 건너뛴다
 * ({@code INSTRUMENTATION_STATUS_CODE: -4} — 통과로 세지 않는다). 인자 값은 <b>서버를 그 지연으로 띄웠다는 선언</b>이다.
 * 테스트는 서버의 지연을 직접 보지 못하므로 「지연이 걸렸다면 가능하지 않은 관찰」(HW5: 첫 화면 뒤 3.5 s 안의
 * {@code finalloopcomplete}, HW6: 3.0 s 안의 {@code finalloopcomplete})로 지연 불성립을 잡는다.
 *
 * <p><b>이미지 캐시는 케이스가 스스로 비운다(r02 R1)</b>: 앱의 Fresco 디스크 캐시는 같은 URL(포트 포함)의 이미지를
 * 남기고, 남아 있으면 앱이 서버에 워드마크를 요청하지 않아 지연 케이스가 「지연 불성립」으로 결정적으로 실패한다
 * (반복 실행 HW5 1/5 · HW6 0/5였다). 그래서 {@code startActivity()}가 매 시작 직전에 비운다 — 계측 프로세스가 앱과
 * 같은 프로세스이므로 {@code Fresco.initialize}가 {@code DuruApplication.onCreate}에서 끝나 있다. 방법: 메모리 캐시는
 * {@code ImagePipeline.clearMemoryCaches()}(동기), 디스크는 {@code ImagePipelineFactory}의 두 {@code FileCache}
 * (주 · 작은 이미지)의 {@code clearAll()}을 직접 부른다 — 동기이고(Fresco 2.3.0 AAR 바이트코드:
 * {@code DiskStorageCache.clearAll}이 락 안에서 저장소를 지우고 인덱스 · 통계를 되돌린다). {@code
 * ImagePipeline.clearDiskCaches()}/{@code clearCaches()}는 쓰지 않는다: 쓰기 실행기에 {@code Task}를 던지고 버려서
 * 비동기이고 완료를 기다릴 방법이 없으며, 늦게 도는 삭제가 다음 시작의 새 캐시를 지울 수도 있다. 비운 뒤 항목
 * 수는 확인하지 않는다(Fresco가 비운 직후 {@code getCount()}에 -1을 내 답할 수 없다 — 비우지 못한 경우는 지연 케이스의
 * 「지연 불성립」 단언이 잡는다).
 * 이미지 캐시를 비우므로 앱의 이미지 캐시가 지워진다(기기의 다른 앱 · 앱 저장소 밖의 상태는 건드리지 않는다).
 * 앞선 실행이 남긴 요청이 비운 뒤에 도착해 캐시를 다시 채우는 경우는 막지 못한다(드물다 — 케이스 사이에 활동을
 * 끝내고 풀이 빌 때까지 기다린다). 그래도 「지연 불성립」이 나면 서버의 요청 기록으로 가른다.
 *
 * 종료 코드로 판정하지 않는다 — 출력의 {@code OK (N tests)} · 케이스별 {@code INSTRUMENTATION_STATUS_CODE}로 본다.
 *
 * <p><b>기기 상태를 바꾼다</b>: 앱 저장소({@code duru-storage})를 백업하고 비운 채 시작해(세션 없음 → 스플래시 →
 * 온보딩) {@code @After}가 되돌린다. 러너가 중간에 죽으면 남으므로 수동 원복: {@code adb -s <device> shell pm clear
 * libitum.duru.android}(개발용 기기에서만). Maestro · 다른 계측 · e2e와 동시에 돌리지 않는다.
 */
@RunWith(AndroidJUnit4.class)
public final class SplashWordmarkHostTest {
  private static final long LOAD_TIMEOUT_MS = 20000;
  private static final long STEP_TIMEOUT_MS = 8000;
  /** {@code entrySplashDurationMs}(apps/mobile/src/lib/entry-flow.ts). 안전 타이머의 상한. */
  private static final long SPLASH_MAX_MS = 4000;
  /** HIGH 래치를 푼 뒤 워드마크 노드가 아직 트리에 있어야 하는 시점. */
  private static final long LOGO_PRESENT_AT_MS = 1500;
  /** brief-io 래치를 HIGH 래치를 푼 뒤 이 시간 뒤에 푼다. */
  private static final long IO_RELEASE_AFTER_MS = 2000;
  private static final long LOG_POLL_MS = 100;
  private static final int IO_BLOCKERS = 8;
  private static final int HIGH_BLOCKERS = 12;
  private static final int NATURAL_RUNS = 5;
  /**
   * HW5: 지연 2000 ms가 걸렸다면 {@code finalloopcomplete}는 첫 화면 뒤 약 4.4 s 이전에 올 수 없다(지연 없음은 약 3.0 s).
   * 그 사이에 오면 지연 불성립이다.
   */
  private static final long LATE_MIN_FINAL_LOOP_MS = 3500;
  /** HW6: 지연 1000 ms면 첫 화면 → {@code finalloopcomplete}가 약 3.6 s다(지연 없음은 약 3.0 s). 3.0 s 미만은 지연 불성립. */
  private static final long LATE_MIN_FINAL_LOOP_MS_1S = 3000;
  /** HW5: 온보딩 「Next」가 첫 화면 뒤 이보다 일찍 서면 스플래시가 일찍 닫힌 것이다. */
  private static final long LATE_NEXT_MIN_MS = 3000;
  /** HW5 · HW6의 logcat 읽기 간격. 트리는 25 ms마다 본다. */
  private static final long LATE_LOG_POLL_MS = 250;

  private static final String LOGO_TESTID = "splash-screen-logo";
  private static final String ONBOARDING_NEXT = "Next";
  private static final String HERO_TESTID = "onboarding-screen-hero";

  private static final String LOG_ON_FAILED = "LynxImageManager: onFailed";
  private static final String LOG_FINAL_LOOP = "SendCustomEvent event name:finalloopcomplete";
  private static final String LOG_ERROR_EVENT = "SendCustomEvent event name:error";
  private static final String LOG_FIRST_SCREEN = "LynxTemplateRender: onFirstScreen";
  private static final String LOG_ASYNC_NOT_DONE =
      "createViewAsync not done, will create on ui thread, tagName:image";
  private static final String LOG_UNSUPPORTED_SCHEME = "Unsupported uri scheme";

  private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
  private final List<MainActivity> live = new CopyOnWriteArrayList<>();
  private final AtomicReference<MainActivity> latest = new AtomicReference<>();
  private final CountDownLatch ioLatch = new CountDownLatch(1);
  private final CountDownLatch highLatch = new CountDownLatch(1);
  private Application.ActivityLifecycleCallbacks callbacks;
  private boolean started;
  private Map<String, ?> savedStorage;
  private String bundleUrl;

  // ---- 도구 ----------------------------------------------------------------

  private String shell(String command) {
    try (InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(
            instrumentation.getUiAutomation().executeShellCommand(command));
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[8192];
      for (int read = in.read(buffer); read >= 0; read = in.read(buffer)) out.write(buffer, 0, read);
      return out.toString("UTF-8");
    } catch (IOException error) {
      throw new AssertionError("shell command failed: " + command, error);
    }
  }

  private static boolean await(long timeoutMs, BooleanSupplier condition) {
    long deadline = SystemClock.uptimeMillis() + timeoutMs;
    while (SystemClock.uptimeMillis() < deadline) {
      if (condition.getAsBoolean()) return true;
      SystemClock.sleep(25);
    }
    return condition.getAsBoolean();
  }

  private <T> T onMain(Callable<T> task) {
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

  // ---- logcat (이 프로세스, 시작 시각 이후) -----------------------------------------

  /** {@code sinceMs}(기기 벽시계) 이후 이 프로세스가 남긴 logcat 줄. */
  private List<String> logLines(long sinceMs) {
    String dump = shell("logcat -d -v epoch --pid " + Process.myPid());
    double since = sinceMs / 1000.0;
    List<String> lines = new ArrayList<>();
    for (String raw : dump.split("\n")) {
      String line = raw.trim();
      int space = line.indexOf(' ');
      if (space <= 0) continue;
      try {
        if (Double.parseDouble(line.substring(0, space)) >= since) lines.add(line);
      } catch (NumberFormatException header) {
        // "--------- beginning of main" 같은 머리글.
      }
    }
    return lines;
  }

  private static List<String> matching(List<String> lines, String needle) {
    List<String> hits = new ArrayList<>();
    for (String line : lines) if (line.contains(needle)) hits.add(line);
    return hits;
  }

  private static boolean has(List<String> lines, String needle) {
    return !matching(lines, needle).isEmpty();
  }

  // ---- 트리 관찰 --------------------------------------------------------------

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

  private LynxView lynxViewOf(Activity activity) {
    return onMain(() -> {
      ViewGroup content = activity.findViewById(android.R.id.content);
      View first = content == null ? null : content.getChildAt(0);
      return first instanceof LynxView ? (LynxView) first : null;
    });
  }

  private boolean hasTestId(String testId) {
    MainActivity activity = latest.get();
    LynxView view = activity == null ? null : lynxViewOf(activity);
    if (view == null) return false;
    return onMain(() -> findByTestId(view.getLynxUIRoot(), testId) != null);
  }

  private boolean hasLabel(String label) {
    MainActivity activity = latest.get();
    LynxView view = activity == null ? null : lynxViewOf(activity);
    if (view == null) return false;
    return onMain(() -> findByLabel(view.getLynxUIRoot(), label) != null);
  }

  /**
   * 첫 화면이 섰는가 — logcat {@code LynxTemplateRender: onFirstScreen}. (스플래시에는 상태바 표지가 없어
   * {@code statusBarIcons.applyCount()}가 오르지 않으므로 그 값으로는 볼 수 없다.)
   */
  private boolean firstScreenReached(long sinceMs) {
    return has(logLines(sinceMs), LOG_FIRST_SCREEN);
  }

  // ---- 풀 잠재우기 ----------------------------------------------------------------

  private static void awaitQuietly(CountDownLatch latch) {
    try {
      latch.await(60, TimeUnit.SECONDS);
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
    }
  }

  private void blockPools() {
    for (int i = 0; i < IO_BLOCKERS; i++) {
      LynxThreadPool.getBriefIOExecutor().execute(() -> awaitQuietly(ioLatch));
    }
    for (int i = 0; i < HIGH_BLOCKERS; i++) {
      LynxThreadPool.postUIOperationTask((Runnable) () -> awaitQuietly(highLatch));
    }
  }

  /** 두 풀이 실제로 비었는가: 새 작업이 상한 안에 돈다. 다른 계측으로 새지 않는지 본다. */
  private boolean poolsDrain() {
    CountDownLatch io = new CountDownLatch(1);
    CountDownLatch high = new CountDownLatch(1);
    LynxThreadPool.getBriefIOExecutor().execute(io::countDown);
    LynxThreadPool.postUIOperationTask((Runnable) high::countDown);
    try {
      return io.await(5, TimeUnit.SECONDS) && high.await(5, TimeUnit.SECONDS);
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      return false;
    }
  }

  // ---- 시작 · 끝 ------------------------------------------------------------

  private void register() {
    Application application =
        (Application) instrumentation.getTargetContext().getApplicationContext();
    callbacks = new Application.ActivityLifecycleCallbacks() {
      @Override public void onActivityCreated(Activity activity, Bundle state) {
        if (activity instanceof MainActivity) {
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

  private void requireBundleUrl() {
    bundleUrl = InstrumentationRegistry.getArguments().getString("bundleUrl");
    assertNotNull(
        "precondition: instrumentation argument bundleUrl is missing — pass "
            + "-e bundleUrl http://10.0.2.2:<port>/main.lynx.bundle (serve the bundle first)",
        bundleUrl);
  }

  /** 저장소를 백업하고 비운 채(세션 없음 → 스플래시 → 온보딩) 준비한다. 한 케이스에서 한 번만. */
  private void prepare() {
    requireBundleUrl();
    started = true;
    savedStorage = new HashMap<>(storage().getAll());
    register();
  }

  /**
   * 앱의 이미지 캐시(메모리 + 디스크)를 비운다 — 클래스 주석 「이미지 캐시는 케이스가 스스로 비운다」. 모두 동기다.
   * 비운 뒤 항목 수를 확인하지 않는다: Fresco 2.3.0 {@code DiskStorageCache.clearAll()}이 통계를 되돌려 {@code
   * getCount()}가 비운 직후 항상 -1(미초기화)을 내므로 그 값으로는 비움 여부를 가를 수 없다. 비우지 못해 캐시가 적중하면
   * 지연 케이스의 「지연 불성립」 단언이 (서버 요청 없이 일찍 닫혀) 실패하지만, 그 실패만으로는 캐시 적중과 서버가 지연을
   * 걸지 않은 경우를 가를 수 없다 — 서버의 요청 기록으로 가른다(delayNotHeld 주석).
   */
  private void clearImageCaches() {
    assertTrue(
        "precondition: Fresco was not initialized in the app process (DuruApplication.onCreate) — "
            + "the image cache cannot be cleared, so a cached wordmark could hide the delay",
        Fresco.hasBeenInitialized());
    ImagePipelineFactory factory = Fresco.getImagePipelineFactory();
    Fresco.getImagePipeline().clearMemoryCaches();
    factory.getMainFileCache().clearAll();
    factory.getSmallImageFileCache().clearAll();
    Log.i("SplashWordmarkHostTest", "image cache cleared before start");
  }

  /** 기기 벽시계로 본 시작 시각을 돌려주고 {@code MainActivity}를 띄운다(앱 저장소 · 이미지 캐시는 매번 비운다). */
  private long startActivity() {
    assertTrue("precondition: could not clear the app storage", storage().edit().clear().commit());
    clearImageCaches();
    long startMs = System.currentTimeMillis();
    Intent launch = new Intent(Intent.ACTION_MAIN);
    launch.setClass(instrumentation.getTargetContext(), MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    launch.putExtra("bundle-url", bundleUrl);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(launch);
    instrumentation.waitForIdleSync();
    assertNotNull("precondition: content view's first child is not a LynxView",
        lynxViewOf(activity));
    return startMs;
  }

  private void finishLive() {
    for (MainActivity activity : new ArrayList<>(live)) {
      instrumentation.runOnMainSync(activity::finish);
    }
    await(STEP_TIMEOUT_MS, live::isEmpty);
  }

  @After public void restore() {
    // 래치를 가장 먼저 푼다 — 풀은 프로세스에 남고, 막힌 채 두면 뒤에 도는 계측이 걸린다.
    ioLatch.countDown();
    highLatch.countDown();
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
    if (!poolsDrain()) {
      failures.add("a Lynx thread pool (brief-io or HIGH) is still blocked after the latches were "
          + "released — later tests in this process would hang");
    }
    if (!failures.isEmpty()) throw new AssertionError("restore failed: " + failures);
  }

  // ---- 한 번의 시작에 대한 관찰 ----------------------------------------------------

  private static final class Run {
    long startMs;
    /** 첫 화면 줄의 logcat 시각(기기 벽시계, ms). 늦은 도착 케이스(HW5 · HW6)만 채운다. */
    long firstScreenAtMs;
    /** 온보딩 「Next」를 처음 본 시각(기기 벽시계, ms). 0 = 못 봤다. */
    long nextAtMs;
    /** 첫 화면 뒤 1.5 s 이후 처음 워드마크 노드를 본 시각의 첫 화면 대비 ms. -1 = 그 시점까지 못 갔다. */
    long logoSampledAfterMs = -1;
    /** {@code finalloopcomplete} 줄의 logcat 시각(기기 벽시계, ms). 0 = 없다. */
    long finalLoopAtMs;
    boolean firstScreen;
    boolean logoEverSeen;
    boolean nextEverSeen;
    boolean logoAtWindow;
    boolean nextBeforeFinalLoop;
    List<String> logs = new ArrayList<>();
  }

  private void observeTree(Run run) {
    if (hasTestId(LOGO_TESTID)) run.logoEverSeen = true;
    if (hasLabel(ONBOARDING_NEXT)) run.nextEverSeen = true;
  }

  /**
   * 풀을 잠재운 강제 조건에서 한 번 시작한다. 첫 화면 → HIGH 래치 풀기 → 1.5 s 시점의 워드마크 노드 → brief-io 래치
   * 풀기 → 마무리 이벤트(또는 실패)까지 관찰한다.
   */
  private Run forcedStart() {
    Run run = new Run();
    blockPools();
    run.startMs = startActivity();
    long loadDeadline = SystemClock.uptimeMillis() + LOAD_TIMEOUT_MS;
    while (SystemClock.uptimeMillis() < loadDeadline) {
      observeTree(run);
      if (firstScreenReached(run.startMs)) {
        run.firstScreen = true;
        break;
      }
      SystemClock.sleep(25);
    }
    long releasedAt = SystemClock.uptimeMillis();
    highLatch.countDown();

    // 1.5 s 창: 트리를 자주 본다. 창이 끝나는 시점의 워드마크 노드가 (b)다.
    while (SystemClock.uptimeMillis() - releasedAt < LOGO_PRESENT_AT_MS) {
      observeTree(run);
      SystemClock.sleep(25);
    }
    run.logoAtWindow = hasTestId(LOGO_TESTID);
    if (run.logoAtWindow) run.logoEverSeen = true;

    // 마무리(finalloopcomplete) · 실패(error · onFailed) · 온보딩 「Next」 가운데 먼저 오는 것까지.
    long deadline = releasedAt + SPLASH_MAX_MS + 2000;
    boolean ioReleased = false;
    while (SystemClock.uptimeMillis() < deadline) {
      if (!ioReleased && SystemClock.uptimeMillis() - releasedAt >= IO_RELEASE_AFTER_MS) {
        ioLatch.countDown();
        ioReleased = true;
      }
      boolean nextNow = hasLabel(ONBOARDING_NEXT);
      if (nextNow) run.nextEverSeen = true;
      if (hasTestId(LOGO_TESTID)) run.logoEverSeen = true;
      // 「Next」를 먼저 읽고 logcat을 나중에 읽는다: Next가 보였는데 이벤트가 아직 없으면 이벤트보다 먼저 선 것이다.
      List<String> logs = logLines(run.startMs);
      run.logs = logs;
      if (has(logs, LOG_FINAL_LOOP)) break;
      if (nextNow) {
        run.nextBeforeFinalLoop = true;
        break;
      }
      if (has(logs, LOG_ERROR_EVENT) || has(logs, LOG_ON_FAILED)) break;
      SystemClock.sleep(LOG_POLL_MS);
    }
    ioLatch.countDown();
    run.logs = logLines(run.startMs);
    return run;
  }

  /** 풀을 잠재우지 않은 자연 조건에서 한 번 시작해 마무리까지 관찰한다. */
  private Run naturalStart() {
    Run run = new Run();
    run.startMs = startActivity();
    long loadDeadline = SystemClock.uptimeMillis() + LOAD_TIMEOUT_MS;
    while (SystemClock.uptimeMillis() < loadDeadline) {
      observeTree(run);
      if (firstScreenReached(run.startMs)) {
        run.firstScreen = true;
        break;
      }
      SystemClock.sleep(25);
    }
    long firstScreenAt = SystemClock.uptimeMillis();
    long deadline = firstScreenAt + SPLASH_MAX_MS + 2000;
    while (SystemClock.uptimeMillis() < deadline) {
      boolean nextNow = hasLabel(ONBOARDING_NEXT);
      if (nextNow) run.nextEverSeen = true;
      if (hasTestId(LOGO_TESTID)) run.logoEverSeen = true;
      List<String> logs = logLines(run.startMs);
      run.logs = logs;
      if (has(logs, LOG_FINAL_LOOP)) break;
      if (nextNow) {
        run.nextBeforeFinalLoop = true;
        break;
      }
      if (has(logs, LOG_ERROR_EVENT) || has(logs, LOG_ON_FAILED)) break;
      SystemClock.sleep(LOG_POLL_MS);
    }
    run.logs = logLines(run.startMs);
    return run;
  }

  /** logcat {@code -v epoch} 줄의 시각(기기 벽시계, ms). */
  private static long epochMsOf(String line) {
    return (long) (Double.parseDouble(line.substring(0, line.indexOf(' '))) * 1000.0);
  }

  /**
   * 워드마크 응답이 늦는 번들 서버(HW5 · HW6)에서 풀을 잠재우지 않고 한 번 시작한다. 첫 화면 줄의 logcat 시각을 원점으로
   * 첫 화면 뒤 1.5 s 시점의 워드마크 노드, 마무리 이벤트, 온보딩 「Next」가 선 시각을 같은 기기 시계로 잰다.
   * {@code finalloopcomplete}가 오면 거기서 멈추고(그 뒤 「Next」는 단언이 기다린다), 「Next」가 먼저 서거나 실패 이벤트가
   * 오면 거기서 멈춘다. 없으면 첫 화면 뒤 {@code SPLASH_MAX_MS + 3 s}까지 본다.
   */
  private Run lateArrivalStart() {
    Run run = new Run();
    run.startMs = startActivity();
    long loadDeadline = SystemClock.uptimeMillis() + LOAD_TIMEOUT_MS;
    while (SystemClock.uptimeMillis() < loadDeadline) {
      observeTree(run);
      List<String> first = matching(logLines(run.startMs), LOG_FIRST_SCREEN);
      if (!first.isEmpty()) {
        run.firstScreen = true;
        run.firstScreenAtMs = epochMsOf(first.get(0));
        break;
      }
      SystemClock.sleep(25);
    }
    if (!run.firstScreen) {
      run.logs = logLines(run.startMs);
      return run;
    }
    long deadline = run.firstScreenAtMs + SPLASH_MAX_MS + 3000;
    long lastLogReadAt = 0;
    while (System.currentTimeMillis() < deadline) {
      long now = System.currentTimeMillis();
      if (run.logoSampledAfterMs < 0 && now - run.firstScreenAtMs >= LOGO_PRESENT_AT_MS) {
        run.logoAtWindow = hasTestId(LOGO_TESTID);
        run.logoSampledAfterMs = now - run.firstScreenAtMs;
        if (run.logoAtWindow) run.logoEverSeen = true;
      }
      // 트리는 자주(25 ms) 본다 — 「Next」가 선 시각을 재는 창(3.0 ~ 6 s)이 logcat 덤프의 지연에 밀리지 않게.
      // logcat은 250 ms마다 읽는다. 「Next」를 먼저 읽고 logcat을 나중에 읽는다(HW1과 같다).
      boolean nextNow = hasLabel(ONBOARDING_NEXT);
      long observedAt = System.currentTimeMillis();
      if (nextNow) {
        run.nextEverSeen = true;
        if (run.nextAtMs == 0) run.nextAtMs = observedAt;
      }
      if (nextNow || observedAt - lastLogReadAt >= LATE_LOG_POLL_MS) {
        lastLogReadAt = observedAt;
        List<String> logs = logLines(run.startMs);
        run.logs = logs;
        List<String> finalLoop = matching(logs, LOG_FINAL_LOOP);
        if (!finalLoop.isEmpty()) {
          run.finalLoopAtMs = epochMsOf(finalLoop.get(0));
          break;
        }
        if (nextNow) {
          run.nextBeforeFinalLoop = true;
          break;
        }
        if (has(logs, LOG_ERROR_EVENT) || has(logs, LOG_ON_FAILED)) break;
      }
      SystemClock.sleep(25);
    }
    run.logs = logLines(run.startMs);
    // 시간 창이 기기에서 타당한지 보도록 관찰값을 남긴다(판정에 쓰지 않는다): adb logcat -s SplashWordmarkHostTest
    Log.i(
        "SplashWordmarkHostTest",
        "lateArrival firstScreen→logoSample=" + run.logoSampledAfterMs + " ms (node present="
            + run.logoAtWindow + "), firstScreen→finalloopcomplete="
            + (run.finalLoopAtMs > 0 ? run.finalLoopAtMs - run.firstScreenAtMs : -1)
            + " ms, firstScreen→Next="
            + (run.nextAtMs > 0 ? run.nextAtMs - run.firstScreenAtMs : -1) + " ms");
    return run;
  }

  /** (b): 이 실행의 이미지 실패 · {@code error} 이벤트 0줄. 늦은 도착은 실패가 아니다. */
  private void assertNoImageFailure(Run run, String condition) {
    List<String> failed = matching(run.logs, LOG_ON_FAILED);
    List<String> errors = matching(run.logs, LOG_ERROR_EVENT);
    assertTrue(
        condition + ": (b) an image request failed — " + failed + " | error events: " + errors,
        failed.isEmpty() && errors.isEmpty());
  }

  /**
   * 「지연 불성립」 메시지. 시작 전에 이미지 캐시를 비우도록 호출하지만 비워졌는지는 확인하지 않으므로 캐시 적중은 원인
   * 후보에 남는다. 후보는 (가) 이미지 캐시 적중(앱이 서버에 요청하지 않음), (나) 서버가 지연을 걸지 않음. 판정은 서버의 요청
   * 기록(워드마크 요청 0건이면 (가), 1건인데 응답이 일찍이면 (나) — 서버의 지연 인자 확인). 디스크 항목 수는 Fresco가 -1을
   * 내므로 쓰지 않는다.
   */
  private static String delayNotHeld(String condition, Run run, long finalLoopAfterMs, String why) {
    return condition + ": 지연 불성립 — 'finalloopcomplete' arrived " + finalLoopAfterMs
        + " ms after the first screen (" + why + "), so the wordmark delay did not hold. The image "
        + "cache clear was called before this start but its result is not checked, so a cache hit "
        + "is still a candidate. Tell the causes apart with the server's request log: no wordmark "
        + "request = image cache hit (the clear did not take effect); one wordmark request answered "
        + "early = the server did not delay it (check the server's delay argument). This run "
        + "proves nothing";
  }

  private static boolean delayArgIs(String delayMs) {
    return delayMs.equals(InstrumentationRegistry.getArguments().getString("wordmarkDelayMs"));
  }

  // ---- 단언 ----------------------------------------------------------------------

  /** HW0: 번들이 실제로 로드됐다. 아니면 실패한다(건너뛰지 않는다). */
  private void assertBundleLoaded(Run run) {
    boolean onFirstScreenLogged = has(run.logs, LOG_FIRST_SCREEN);
    boolean surfaceSeen = run.logoEverSeen || run.nextEverSeen;
    assertTrue(
        "번들이 로드되지 않았다: " + bundleUrl + " — bundleUrl · 서버를 확인 (firstScreen="
            + run.firstScreen + ", logoSeen=" + run.logoEverSeen + ", nextSeen=" + run.nextEverSeen
            + ", onFirstScreen logged=" + onFirstScreenLogged + " within " + LOAD_TIMEOUT_MS + " ms)",
        run.firstScreen && onFirstScreenLogged && surfaceSeen);
  }

  /** (a)(c)(d): 이 실행의 이미지 실패 0줄, 마무리 이벤트, 마무리 뒤에야 「Next」. */
  private void assertWordmarkPlayedToTheEnd(Run run, String condition) {
    List<String> failed = matching(run.logs, LOG_ON_FAILED);
    assertTrue(
        condition + ": (a) an image request failed — " + failed
            + (failed.isEmpty() ? "" : " | error events: " + matching(run.logs, LOG_ERROR_EVENT)),
        failed.isEmpty());
    assertTrue(
        condition + ": (c) 'finalloopcomplete' never arrived (error events: "
            + matching(run.logs, LOG_ERROR_EVENT) + ")",
        has(run.logs, LOG_FINAL_LOOP));
    assertTrue(
        condition + ": (d) the onboarding 'Next' stood before the wordmark finished",
        !run.nextBeforeFinalLoop);
    assertTrue(
        condition + ": (d) the onboarding 'Next' did not stand after the wordmark finished",
        await(STEP_TIMEOUT_MS, () -> hasLabel(ONBOARDING_NEXT)));
  }

  private void assertForcedConditionHeld(Run run) {
    assertTrue(
        "강제 불성립: the log has no '" + LOG_ASYNC_NOT_DONE + "' — the HIGH pool latch did not force "
            + "the image view onto the UI thread, so this run proves nothing (not a pass)",
        has(run.logs, LOG_ASYNC_NOT_DONE));
  }

  // ---- 케이스 ----------------------------------------------------------------

  /**
   * HW1(+HW0): 풀을 잠재운 강제 조건에서 워드마크 요청이 재작성된 URL로 나가 끝까지 재생된다. 수정 전
   * (재작성이 brief-io로 넘어가는 결선)에는 요청이 {@code /static/…}로 나가 {@code Unsupported uri scheme}으로 실패하고
   * 스플래시가 닫힌다 — 10회 가운데 10회.
   */
  @Test public void hw1_forcedRaceKeepsTheWordmarkRequestRewritten() {
    prepare();
    Run run = forcedStart();

    assertBundleLoaded(run);
    assertForcedConditionHeld(run);
    List<String> failed = matching(run.logs, LOG_ON_FAILED);
    assertTrue(
        "forced race: (a) the wordmark request failed — " + failed
            + (has(failed, LOG_UNSUPPORTED_SCHEME)
                ? " [the request went out with the un-rewritten /static/ URL]" : ""),
        failed.isEmpty());
    assertTrue(
        "forced race: (b) the '" + LOGO_TESTID + "' node is gone " + LOGO_PRESENT_AT_MS
            + " ms after the request task was released — the splash already ended "
            + "(error events: " + matching(run.logs, LOG_ERROR_EVENT) + ", Next seen: "
            + run.nextEverSeen + ")",
        run.logoAtWindow);
    assertWordmarkPlayedToTheEnd(run, "forced race");
  }

  /** HW2: 자연 조건(래치 없음)에서 같은 (a)(c)(d). 같은 프로세스에서 5회 다시 띄운다 — 콜드 스타트가 아니다. 가드. */
  @Test public void hw2_naturalStartsKeepTheWordmarkRequestRewritten() {
    prepare();
    for (int i = 1; i <= NATURAL_RUNS; i++) {
      Run run = naturalStart();
      assertBundleLoaded(run);
      assertWordmarkPlayedToTheEnd(run, "natural start " + i + "/" + NATURAL_RUNS);
      finishLive();
    }
  }

  /**
   * HW3: 실패 경로(I1). 워드마크 파일을 지운 번들 서버 사본으로 띄우면({@code -e wordmarkMissing true})
   * {@code Unsupported uri scheme}이 아닌 이유로 실패하고, {@code error} 이벤트가 오고, 첫 화면 뒤
   * {@code entrySplashDurationMs}보다 짧은 시간 안에 온보딩 「Next」가 선다(안전 타이머가 아니라 {@code binderror}가
   * 끝냈다). 가드.
   */
  @Test public void hw3_missingWordmarkEndsTheSplashThroughBinderror() {
    Assume.assumeTrue("needs -e wordmarkMissing true and a bundle server copy without the wordmark file",
        "true".equals(InstrumentationRegistry.getArguments().getString("wordmarkMissing")));
    prepare();
    Run run = new Run();
    run.startMs = startActivity();
    long loadDeadline = SystemClock.uptimeMillis() + LOAD_TIMEOUT_MS;
    while (SystemClock.uptimeMillis() < loadDeadline) {
      observeTree(run);
      if (firstScreenReached(run.startMs)) {
        run.firstScreen = true;
        break;
      }
      SystemClock.sleep(25);
    }
    long firstScreenAt = SystemClock.uptimeMillis();
    boolean nextStood = await(SPLASH_MAX_MS + 2000, () -> hasLabel(ONBOARDING_NEXT));
    long elapsed = SystemClock.uptimeMillis() - firstScreenAt;
    run.logs = logLines(run.startMs);
    run.nextEverSeen |= nextStood;
    assertBundleLoaded(run);

    List<String> failed = matching(run.logs, LOG_ON_FAILED);
    assertTrue("a missing wordmark must be reported as an image failure (no onFailed line)",
        !failed.isEmpty());
    assertTrue(
        "the failure reason must not be '" + LOG_UNSUPPORTED_SCHEME + "' (the URL must have been "
            + "rewritten): " + failed,
        !has(failed, LOG_UNSUPPORTED_SCHEME));
    assertTrue("the image failure must raise the 'error' event", has(run.logs, LOG_ERROR_EVENT));
    assertTrue("the onboarding 'Next' never stood", nextStood);
    assertTrue(
        "the splash ended through the safety timer (" + elapsed + " ms >= " + SPLASH_MAX_MS
            + " ms), not through binderror",
        elapsed < SPLASH_MAX_MS);
  }

  /**
   * HW4: 온보딩의 두 그림({@code story-background} · {@code story-character})도 같은 강제 조건에서 요청이 실패하지
   * 않는다 — 온보딩 히어로({@code onboarding-screen-hero})가 트리에 서고 그 뒤 1 s 동안 {@code onFailed}가 0줄이다.
   * Lynx가 히어로 아래 {@code <image>}를 평탄화해 노드로 남기지 않으므로(계측으로 개수를 볼 수 없다) 판정은 logcat이다.
   * 가드.
   */
  @Test public void hw4_onboardingPicturesLoadUnderTheForcedRace() {
    prepare();
    Run run = forcedStart();
    assertBundleLoaded(run);
    assertForcedConditionHeld(run);
    assertWordmarkPlayedToTheEnd(run, "forced race");

    assertTrue("the onboarding hero ('" + HERO_TESTID + "') never stood in the tree",
        await(STEP_TIMEOUT_MS, () -> hasTestId(HERO_TESTID)));
    SystemClock.sleep(1000);
    List<String> failed = matching(logLines(run.startMs), LOG_ON_FAILED);
    assertEquals("an image request failed on the way to the onboarding: " + failed,
        0, failed.size());
  }

  /**
   * HW5(r02 · 가드): 워드마크 응답이 2000 ms 늦는 서버({@code -e wordmarkDelayMs 2000})에서 이미지는 정상으로 늦게 오고
   * ({@code onFailed} · {@code error} 0), 스플래시는 일찍 닫히지 않으며(첫 화면 뒤 1.5 s에 워드마크 노드가 있다), 4 s 안전
   * 타이머가 끝내 온보딩 「Next」를 세운다(첫 화면 뒤 3.0 s ~ {@code SPLASH_MAX_MS + 2 s}). {@code finalloopcomplete}는
   * 요구하지 않는다 — 없는 것이 정상이다(도착이 1.6 s를 넘으면 재생이 타이머보다 늦게 끝난다). 수정 전에도 통과한다 —
   * 「D1의 모양은 늦은 도착이 만든다 · 그때도 갇히지 않는다」를 고정한다. 실패시키는 변이: 타이머를 1000 ms로 줄인다
   * ((c) — 1.5 s에 노드가 없다) · 인터셉터가 원본을 돌려준다({@code onFailed}). <b>안전 타이머 제거는 이 케이스를
   * 실패시키지 못한다</b>(실측: 이미지가 2.2 s에 와서 {@code finalloopcomplete}가 약 5 s에 스플래시를 닫는다) — 그 변이는
   * HW7이 지킨다.
   */
  @Test public void hw5_lateWordmarkStillLetsTheSplashEndAndOnboardingStand() {
    Assume.assumeTrue("needs -e wordmarkDelayMs 2000 and a bundle server that delays the wordmark "
        + "response by 2000 ms (apps/android/tools/wordmark-delay-server.py <dir> <port> 2000)",
        delayArgIs("2000"));
    prepare();
    Run run = lateArrivalStart();
    assertSafetyTimerEndsTheSplash(run, "late wordmark (2000 ms)", 2000, LATE_MIN_FINAL_LOOP_MS);
  }

  /**
   * HW7(r02 · 보강 가드 — 계약의 HW5 · HW6 밖): HW5의 2000 ms는 안전 타이머를 떼도 통과한다(타이머 없이도 약 5 s에
   * {@code finalloopcomplete}가 스플래시를 닫는다 — 실측). 이 케이스는 워드마크가 <b>8000 ms</b> 늦는 서버
   * ({@code -e wordmarkDelayMs 8000})로 같은 단언을 건다: 이미지가 와서 닫을 수 없으므로 안전 타이머만이 「Next」를
   * 세울 수 있다. 실패시키는 변이: 안전 타이머 제거({@code SplashScreen.tsx}) → 「Next」가 서지 않는다.
   */
  @Test public void hw7_veryLateWordmarkIsEndedBySafetyTimerAlone() {
    Assume.assumeTrue("needs -e wordmarkDelayMs 8000 and a bundle server that delays the wordmark "
        + "response by 8000 ms (apps/android/tools/wordmark-delay-server.py <dir> <port> 8000)",
        delayArgIs("8000"));
    prepare();
    Run run = lateArrivalStart();
    // 8 s 지연이면 첫 화면 뒤 7 s 안에 finalloopcomplete가 올 수 없다 — 오면 지연 불성립이다.
    assertSafetyTimerEndsTheSplash(run, "very late wordmark (8000 ms)", 8000, Long.MAX_VALUE);
  }

  /**
   * HW5 · HW7의 공통 단언: 번들 로드(HW0), (b) 이미지 실패 0, (c) 첫 화면 뒤 1.5 s에 워드마크 노드가 있다, (d) 첫 화면 뒤
   * 3.0 s ~ {@code SPLASH_MAX_MS + 2 s}에 「Next」가 선다. {@code finalloopcomplete}는 요구하지 않는다.
   * {@code finalLoopFloorMs}: 지연이 걸렸다면 이 값보다 일찍 {@code finalloopcomplete}가 올 수 없다.
   */
  private void assertSafetyTimerEndsTheSplash(
      Run run, String condition, long delayMs, long finalLoopFloorMs) {
    assertBundleLoaded(run);
    assertNoImageFailure(run, condition);
    assertTrue(
        condition + ": (c) the splash was never sampled " + LOGO_PRESENT_AT_MS + " ms after the "
            + "first screen (the observation ended first; Next seen: " + run.nextEverSeen + ")",
        run.logoSampledAfterMs >= 0);
    assertTrue(
        condition + ": (c) the '" + LOGO_TESTID + "' node is gone " + run.logoSampledAfterMs
            + " ms after the first screen — the splash closed early (Next seen: "
            + run.nextEverSeen + ")",
        run.logoAtWindow);
    // 지연이 걸렸다면 가능하지 않은 관찰: 워드마크가 평소보다 1.4 s 이상 늦으면 재생은 4 s를 넘겨 끝난다.
    if (run.finalLoopAtMs > 0) {
      long finalLoopAfterMs = run.finalLoopAtMs - run.firstScreenAtMs;
      assertTrue(
          delayNotHeld(condition, run, finalLoopAfterMs,
              "which a " + delayMs + " ms late wordmark cannot do"),
          finalLoopAfterMs >= finalLoopFloorMs);
    }
    assertTrue(
        condition + ": (d) the onboarding 'Next' never stood (the splash is stuck)",
        run.nextAtMs > 0 || await(STEP_TIMEOUT_MS, () -> hasLabel(ONBOARDING_NEXT)));
    long nextAfterMs =
        (run.nextAtMs > 0 ? run.nextAtMs : System.currentTimeMillis()) - run.firstScreenAtMs;
    assertTrue(
        condition + ": (d) the onboarding 'Next' stood " + nextAfterMs + " ms after the first "
            + "screen, before the " + LATE_NEXT_MIN_MS + " ms floor — the splash ended early",
        nextAfterMs >= LATE_NEXT_MIN_MS);
    assertTrue(
        condition + ": (d) the onboarding 'Next' stood " + nextAfterMs + " ms after the first "
            + "screen, after the " + (SPLASH_MAX_MS + 2000) + " ms ceiling — the safety timer "
            + "did not end the splash in time",
        nextAfterMs <= SPLASH_MAX_MS + 2000);
  }

  /**
   * HW6(r02 · 가드): 워드마크 응답이 1000 ms 늦는 서버({@code -e wordmarkDelayMs 1000})에서도 재생은 끝까지 간다 —
   * {@code onFailed} · {@code error} 0, {@code finalloopcomplete}가 오고 그 뒤에야 「Next」가 선다. 첫 화면에서
   * {@code finalloopcomplete}까지가 3.0 s 이상이어야 한다(지연이 실제로 걸렸다 — 평소는 약 3.0 s, 지연 1 s면 약 3.6 s;
   * 아니면 「지연 불성립」으로 실패한다). 수정 전에도 통과한다. 실패시키는 변이: {@code entrySplashDurationMs}를 3000으로
   * ({@code finalloopcomplete}가 오기 전에 타이머가 닫는다).
   */
  @Test public void hw6_wordmarkLateByOneSecondStillPlaysToTheEnd() {
    Assume.assumeTrue("needs -e wordmarkDelayMs 1000 and a bundle server that delays the wordmark "
        + "response by 1000 ms (apps/android/tools/wordmark-delay-server.py <dir> <port> 1000)",
        delayArgIs("1000"));
    prepare();
    Run run = lateArrivalStart();
    String condition = "late wordmark (1000 ms)";

    assertBundleLoaded(run);
    assertNoImageFailure(run, condition);
    assertWordmarkPlayedToTheEnd(run, condition);
    long finalLoopAfterMs = run.finalLoopAtMs - run.firstScreenAtMs;
    assertTrue(
        delayNotHeld(condition, run, finalLoopAfterMs, "< " + LATE_MIN_FINAL_LOOP_MS_1S + " ms"),
        finalLoopAfterMs >= LATE_MIN_FINAL_LOOP_MS_1S);
  }
}
