package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.tasm.LynxView;
import java.util.function.BooleanSupplier;
import org.junit.After;
import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * android-launch-appearance integration IC1~IC4 (계약 spec.md §6, 계획 test-plan.md).
 *
 * <p>값을 읽을 뿐 화면이 그려지기를 기다리지 않는다. 시작 창 · 시스템 스플래시가 실제로 그려지는 픽셀과 런처의
 * 마스크는 계측 프로세스가 뜬 뒤에는 이미 지나갔으므로 e2e(docs/e2e/android-launch-appearance.md)가 본다.
 * 여기서는 {@code PackageManager} · {@code Resources.Theme}로 풀린 속성 값과 아이콘 drawable의 종류 · 색을 본다.
 *
 * <p>아직 없는 리소스 id는 컴파일 타임에 참조하지 않는다 — {@code Resources.getIdentifier}로 런타임에 찾는다.
 * 그래서 리소스가 없는 구현 전에도 계측 APK가 컴파일되고, 실패는 단언 실패로 선다.
 *
 * <p>실행 (기기마다, API 37 {@code emulator-5554} · API 30 {@code R6_API30} 둘 다):
 *
 * <pre>
 * cd apps/android &amp;&amp; ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
 * adb -s &lt;device&gt; install -r -t app/build/outputs/apk/debug/app-debug.apk
 * adb -s &lt;device&gt; install -r -t app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
 * adb -s &lt;device&gt; shell am instrument -w -r -e class com.libitum.host.LaunchAppearanceTest \
 *   libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
 * </pre>
 *
 * 종료 코드로 판정하지 않는다 — 출력의 {@code OK (N tests)} 또는 케이스별 {@code INSTRUMENTATION_STATUS_CODE}로 본다.
 *
 * <p>API 수준에 따라 없는 속성은 {@code Assume}으로 건너뛴다: IC3은 {@code windowSplashScreen*}가 31 이상에서만,
 * IC1의 {@code windowLightNavigationBar} 단언은 27 이상에서만, IC2의 {@code getMonochrome()} 단언은 33 이상에서만 한다.
 * <b>IC3(API 30)의 건너뜀은 {@code am instrument -r}의 {@code INSTRUMENTATION_STATUS_CODE: -4}로만 보이고
 * {@code OK (4 tests)}에는 섞여 보인다 — 통과로 세지 않는다.</b>
 *
 * <p>전역 기기 상태를 바꾸지 않는다(설정 · 야간 모드 · 크기 변경 없음). IC4가 띄운 {@code MainActivity}는 {@code @After}가 끝낸다.
 * 앱 저장소도 건드리지 않는다. 번들 서버 · 네트워크 · Firebase는 필요 없다.
 */
@RunWith(AndroidJUnit4.class)
public final class LaunchAppearanceTest {
  private static final int LAUNCH_COLOR = 0xFFF46B18;
  private static final long TIMEOUT_MS = 10000;

  private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
  private Activity launched;

  private Context target() {
    return instrumentation.getTargetContext();
  }

  /** 앱 리소스를 이름으로 찾는다. 없으면 0. */
  private int identifier(String name, String type) {
    return target().getResources().getIdentifier(name, type, target().getPackageName());
  }

  /** MainActivity가 실제로 쓰는 테마(Activity 테마, 없으면 Application 테마)를 푼 Theme. */
  private Resources.Theme mainActivityTheme() throws Exception {
    ActivityInfo info =
        target()
            .getPackageManager()
            .getActivityInfo(new ComponentName(target(), MainActivity.class), 0);
    int themeResource = info.getThemeResource();
    assertNotEquals("MainActivity has no theme resource at all", 0, themeResource);
    Resources.Theme theme = target().getResources().newTheme();
    theme.applyStyle(themeResource, true);
    return theme;
  }

  private static String hex(int value) {
    return String.format("0x%08X", value);
  }

  /** 테마의 색 속성을 푼다. 색이 아니면(파일 drawable 등) 이유를 적고 실패한다. */
  private static int themeColor(Resources.Theme theme, int attribute, String name) {
    TypedValue value = new TypedValue();
    assertTrue(name + " is not defined in the MainActivity theme", theme.resolveAttribute(attribute, value, true));
    assertTrue(
        name + " must resolve to a colour but resolved to type 0x" + Integer.toHexString(value.type)
            + " (string=" + value.string + ", resourceId=0x" + Integer.toHexString(value.resourceId) + ")",
        value.type >= TypedValue.TYPE_FIRST_COLOR_INT && value.type <= TypedValue.TYPE_LAST_COLOR_INT);
    return value.data;
  }

  private static boolean themeBoolean(Resources.Theme theme, int attribute, String name) {
    TypedValue value = new TypedValue();
    assertTrue(name + " is not defined in the MainActivity theme", theme.resolveAttribute(attribute, value, true));
    assertEquals(name + " must be a boolean", TypedValue.TYPE_INT_BOOLEAN, value.type);
    return value.data != 0;
  }

  private static boolean await(long timeoutMs, BooleanSupplier condition) {
    long deadline = SystemClock.uptimeMillis() + timeoutMs;
    while (SystemClock.uptimeMillis() < deadline) {
      if (condition.getAsBoolean()) return true;
      SystemClock.sleep(50);
    }
    return condition.getAsBoolean();
  }

  private static Bitmap render(Drawable drawable) {
    Bitmap bitmap = Bitmap.createBitmap(108, 108, Bitmap.Config.ARGB_8888);
    drawable.setBounds(0, 0, 108, 108);
    drawable.draw(new Canvas(bitmap));
    return bitmap;
  }

  @After public void finishLaunched() {
    Activity activity = launched;
    launched = null;
    if (activity == null) return;
    instrumentation.runOnMainSync(activity::finish);
    await(TIMEOUT_MS, activity::isDestroyed);
  }

  /** IC1: 테마에서 풀린 창 배경 · 상태바 · 내비게이션 바 값. */
  @Test public void ic1_mainActivityThemeResolvesLaunchBackgroundAndSystemBars() throws Exception {
    int launchBackground = identifier("launch_background", "color");
    assertNotEquals("R.color.launch_background does not exist yet", 0, launchBackground);
    int expected = target().getColor(launchBackground);
    assertEquals("launch_background must be #F46B18", LAUNCH_COLOR, expected);

    Resources.Theme theme = mainActivityTheme();
    assertEquals(
        "android:windowBackground must resolve to the launch colour",
        hex(expected),
        hex(themeColor(theme, android.R.attr.windowBackground, "android:windowBackground")));
    assertEquals(
        "android:statusBarColor must be transparent",
        hex(0),
        hex(themeColor(theme, android.R.attr.statusBarColor, "android:statusBarColor")));
    assertTrue(
        "android:windowLightStatusBar must be true",
        themeBoolean(theme, android.R.attr.windowLightStatusBar, "android:windowLightStatusBar"));
    if (Build.VERSION.SDK_INT >= 27) {
      assertTrue(
          "android:windowLightNavigationBar must be true (API 27+)",
          themeBoolean(
              theme, android.R.attr.windowLightNavigationBar, "android:windowLightNavigationBar"));
    }
  }

  /** IC2: 런처 아이콘은 적응형이고 전경 · 배경 레이어가 계약대로다. */
  @Test public void ic2_applicationIconIsAnAdaptiveIconWithTheContractLayers() throws Exception {
    Drawable icon = target().getPackageManager().getApplicationIcon(target().getPackageName());
    assertTrue(
        "getApplicationIcon must be an AdaptiveIconDrawable but was " + icon.getClass().getName(),
        icon instanceof AdaptiveIconDrawable);
    AdaptiveIconDrawable adaptive = (AdaptiveIconDrawable) icon;

    Bitmap foreground = render(adaptive.getForeground());
    int[][] transparent = {{4, 54}, {10, 54}, {54, 4}};
    for (int[] point : transparent) {
      assertEquals(
          "foreground alpha at (" + point[0] + "," + point[1] + ") must be 0 (the art sits at 14..94)",
          0,
          android.graphics.Color.alpha(foreground.getPixel(point[0], point[1])));
    }
    int[][] opaque = {{20, 54}, {54, 54}, {88, 54}};
    for (int[] point : opaque) {
      assertEquals(
          "foreground alpha at (" + point[0] + "," + point[1] + ") must be 255",
          255,
          android.graphics.Color.alpha(foreground.getPixel(point[0], point[1])));
    }

    Bitmap background = render(adaptive.getBackground());
    assertEquals(
        "background layer centre must be the launch colour",
        hex(LAUNCH_COLOR),
        hex(background.getPixel(54, 54)));

    if (Build.VERSION.SDK_INT >= 33) {
      assertNull("the icon must have no monochrome layer (API 33+)", adaptive.getMonochrome());
    }
  }

  /** IC3: API 31+의 시스템 스플래시 속성 값. 31 미만은 건너뜀(통과로 세지 않는다). */
  @Test public void ic3_splashScreenAttributesResolveOnApi31Plus() throws Exception {
    Assume.assumeTrue(
        "windowSplashScreen* attributes exist only on API 31+ (this device is API " + Build.VERSION.SDK_INT + ")",
        Build.VERSION.SDK_INT >= 31);
    Resources.Theme theme = mainActivityTheme();

    assertEquals(
        "android:windowSplashScreenBackground must be the launch colour",
        hex(LAUNCH_COLOR),
        hex(
            themeColor(
                theme,
                android.R.attr.windowSplashScreenBackground,
                "android:windowSplashScreenBackground")));

    int expectedIcon = identifier("splash_icon_none", "drawable");
    assertNotEquals("R.drawable.splash_icon_none does not exist yet", 0, expectedIcon);
    TypedValue icon = new TypedValue();
    assertTrue(
        "android:windowSplashScreenAnimatedIcon is not defined in the MainActivity theme",
        theme.resolveAttribute(android.R.attr.windowSplashScreenAnimatedIcon, icon, true));
    assertEquals(
        "android:windowSplashScreenAnimatedIcon must resolve to drawable/splash_icon_none",
        expectedIcon,
        icon.resourceId);
  }

  private LynxView lynxViewOf(Activity activity) {
    View first = ((ViewGroup) activity.findViewById(android.R.id.content)).getChildAt(0);
    return first instanceof LynxView ? (LynxView) first : null;
  }

  /** IC4: 가드 — 띄운 뒤에도 상태바 · 내비게이션 아이콘이 어둡고 edge-to-edge가 유지된다. */
  @Test public void ic4_edgeToEdgeAndLightBarsSurviveLaunch() {
    Intent intent = new Intent(Intent.ACTION_MAIN);
    intent.setClass(target(), MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    final Activity activity = instrumentation.startActivitySync(intent);
    launched = activity;
    instrumentation.waitForIdleSync();

    final View decor = activity.getWindow().getDecorView();
    assertTrue(
        "precondition: MainActivity window never got focus (device locked or another window in front?)",
        await(TIMEOUT_MS, () -> decor.isAttachedToWindow() && activity.hasWindowFocus()));
    final LynxView lynxView = lynxViewOf(activity);
    assertNotNull("precondition: content view's first child is not a LynxView", lynxView);

    final boolean[] bars = new boolean[2];
    instrumentation.runOnMainSync(
        () -> {
          WindowInsetsControllerCompat controller =
              WindowCompat.getInsetsController(activity.getWindow(), decor);
          bars[0] = controller.isAppearanceLightStatusBars();
          bars[1] = controller.isAppearanceLightNavigationBars();
        });
    assertTrue("isAppearanceLightStatusBars must be true", bars[0]);
    assertTrue("isAppearanceLightNavigationBars must be true", bars[1]);

    final int[] top = {0};
    assertTrue(
        "LynxView never received a top system-bar inset > 0 (edge-to-edge lost?); last top=" + top[0],
        await(
            TIMEOUT_MS,
            () -> {
              instrumentation.runOnMainSync(
                  () -> {
                    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(lynxView);
                    top[0] =
                        insets == null
                            ? 0
                            : insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
                  });
              return top[0] > 0;
            }));
  }
}
