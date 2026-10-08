package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Application;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * android-push-token-refresh integration IC1 · IC2 (계약 spec.md §6.2, 계획 test-plan.md).
 *
 * <p>실제 {@link MainActivity}가 {@link PushTokenRefreshRelay#PROCESS}에 붙고 떼이는 것(IC1)과, SDK 없이
 * {@link DuruFirebaseMessagingService#onNewToken}을 직접 불러도 호스트가 멀쩡한 것(IC2)을 본다.
 *
 * <p><b>이 계측이 보지 못하는 것</b>: {@code lynxView.sendGlobalEvent("pushTokenRefreshed")}가 JS 리스너에
 * 닿는 것. 호스트가 이벤트를 보냈는지도 여기서는 관찰할 수 없다 — 「중계가 Activity의 리스너에 전달했다
 * ({@code notifyRefreshed() == true})」까지만 단언한다. 호스트 → JS → 요청의 이어짐은 이 테스트가 증명하지 않는다
 * (JS 쪽 반응은 vitest IT1, 이벤트 이름 일치는 정적 결선 HT1, 이어진 관찰은 수동 e2e T2).
 *
 * <p>Firebase 설정 · Google Play 서비스 · 네트워크 · 번들 서버가 필요 없다 — 앱을 인자 없이 띄우고(JS가 부팅
 * 중이어도 무방하다) SDK를 거치지 않는다. 다만 통지가 JS까지 가도 서버를 부르지 않게 앱 저장소({@code duru-storage},
 * 세션 포함)를 비우고 {@code @After}에서 되돌린다 — 세션이 없으면 JS의 {@code syncPushDevice}는 끝난다.
 * 그 밖의 전역 상태(토큰 · 권한 · 기기 설정)는 바꾸지 않는다. 실제 서버를 호출하지 않는다.
 *
 * <p>건너뛰는 케이스는 없다. 건너뜀이 생기면 {@code OK (2 tests)}에 섞여 보이지 않는다 —
 * {@code am instrument -r}의 {@code INSTRUMENTATION_STATUS_CODE: -4}로만 보인다.
 *
 * <p>실행: {@code ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest} → 두 APK 설치 →
 * {@code adb -s emulator-5554 shell am instrument -w -e class com.libitum.host.PushTokenRefreshHostTest
 * libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner}.
 */
@RunWith(AndroidJUnit4.class)
public final class PushTokenRefreshHostTest {
  private static final long LIFECYCLE_TIMEOUT_MS = 10000;
  /** 「Activity가 살아 있다」를 보는 창. 파괴가 보이면 바로 실패한다. */
  private static final long ALIVE_WINDOW_MS = 5000;

  private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
  private final AtomicReference<MainActivity> created = new AtomicReference<>();
  private final AtomicBoolean destroyed = new AtomicBoolean();
  private Application.ActivityLifecycleCallbacks callbacks;
  private Map<String, ?> savedStorage;
  private MainActivity activity;

  @After
  public void restore() {
    if (activity != null && !destroyed.get()) {
      instrumentation.runOnMainSync(activity::finish);
      await(LIFECYCLE_TIMEOUT_MS, destroyed::get);
    }
    if (callbacks != null) {
      ((Application) instrumentation.getTargetContext().getApplicationContext())
          .unregisterActivityLifecycleCallbacks(callbacks);
    }
    restoreStorage();
  }

  @Test
  public void IC1_relayDeliversWhileMainActivityIsAliveAndStopsAfterItIsDestroyed() {
    launch();
    assertTrue(
        "precondition: MainActivity must have attached to PushTokenRefreshRelay.PROCESS in onCreate",
        PushTokenRefreshRelay.PROCESS.notifyRefreshed());

    instrumentation.runOnMainSync(activity::finish);
    assertTrue("MainActivity was not destroyed within " + LIFECYCLE_TIMEOUT_MS + " ms",
        await(LIFECYCLE_TIMEOUT_MS, destroyed::get));
    assertFalse(
        "notifyRefreshed() delivered to a listener after MainActivity.onDestroy (detach missing)",
        PushTokenRefreshRelay.PROCESS.notifyRefreshed());
  }

  @Test
  public void IC2_onNewTokenOnAnotherThreadNeverThrowsAndLeavesTheActivityAlive() throws Exception {
    launch();
    AtomicReference<Throwable> failure = new AtomicReference<>();
    Thread sdkExecutor = new Thread(
        () -> {
          try {
            new DuruFirebaseMessagingService().onNewToken("x");
          } catch (Throwable error) {
            failure.set(error);
          }
        },
        "fake-fcm-intent-handle");
    sdkExecutor.start();
    sdkExecutor.join(LIFECYCLE_TIMEOUT_MS);
    assertFalse("onNewToken thread did not finish", sdkExecutor.isAlive());
    assertNull("onNewToken threw with MainActivity alive: " + failure.get(), failure.get());

    assertFalse(
        "MainActivity was destroyed after onNewToken",
        await(ALIVE_WINDOW_MS, () -> destroyed.get() || activity.isFinishing()));

    instrumentation.runOnMainSync(activity::finish);
    assertTrue("MainActivity was not destroyed within " + LIFECYCLE_TIMEOUT_MS + " ms",
        await(LIFECYCLE_TIMEOUT_MS, destroyed::get));
    new DuruFirebaseMessagingService().onNewToken("x"); // Activity 없이도 던지지 않는다.
  }

  /** 앱 저장소를 비우고 MainActivity를 띄워 생성 콜백까지 기다린다. */
  private void launch() {
    SharedPreferences storage = storage();
    savedStorage = new HashMap<>(storage.getAll());
    assertTrue("precondition: could not clear the app storage", storage.edit().clear().commit());

    callbacks =
        new Application.ActivityLifecycleCallbacks() {
          @Override public void onActivityCreated(Activity created, Bundle state) {
            if (created instanceof MainActivity) PushTokenRefreshHostTest.this.created.set((MainActivity) created);
          }

          @Override public void onActivityDestroyed(Activity gone) {
            if (gone == PushTokenRefreshHostTest.this.created.get()) destroyed.set(true);
          }

          @Override public void onActivityStarted(Activity started) {}

          @Override public void onActivityResumed(Activity resumed) {}

          @Override public void onActivityPaused(Activity paused) {}

          @Override public void onActivityStopped(Activity stopped) {}

          @Override public void onActivitySaveInstanceState(Activity saving, Bundle state) {}
        };
    ((Application) instrumentation.getTargetContext().getApplicationContext())
        .registerActivityLifecycleCallbacks(callbacks);

    Intent intent = new Intent(Intent.ACTION_MAIN);
    intent.setClass(instrumentation.getTargetContext(), MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    activity = (MainActivity) instrumentation.startActivitySync(intent);
    instrumentation.waitForIdleSync();
    assertNotNull("precondition: MainActivity did not start", activity);
    assertTrue("precondition: MainActivity onCreate was not observed",
        await(LIFECYCLE_TIMEOUT_MS, () -> created.get() == activity));
  }

  private SharedPreferences storage() {
    return instrumentation.getTargetContext().getSharedPreferences("duru-storage", Context.MODE_PRIVATE);
  }

  private void restoreStorage() {
    if (savedStorage == null) return;
    SharedPreferences.Editor editor = storage().edit().clear();
    for (Map.Entry<String, ?> entry : savedStorage.entrySet()) {
      Object value = entry.getValue();
      if (value instanceof String) editor.putString(entry.getKey(), (String) value);
      else if (value instanceof Boolean) editor.putBoolean(entry.getKey(), (Boolean) value);
      else if (value instanceof Integer) editor.putInt(entry.getKey(), (Integer) value);
      else if (value instanceof Long) editor.putLong(entry.getKey(), (Long) value);
      else if (value instanceof Float) editor.putFloat(entry.getKey(), (Float) value);
    }
    editor.commit();
  }

  private static boolean await(long timeoutMs, BooleanSupplier condition) {
    long deadline = SystemClock.uptimeMillis() + timeoutMs;
    while (SystemClock.uptimeMillis() < deadline) {
      if (condition.getAsBoolean()) return true;
      SystemClock.sleep(50);
    }
    return condition.getAsBoolean();
  }
}
