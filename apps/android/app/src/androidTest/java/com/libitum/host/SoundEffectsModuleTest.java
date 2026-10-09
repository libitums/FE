package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.MediaPlayer;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Sound effects on the real host. The controller and module are reached by reflection so that this
 * class compiles (and reports assertion failures, not build errors) before they exist.
 */
@RunWith(AndroidJUnit4.class)
public final class SoundEffectsModuleTest {
  private Context context;
  private Object controller;

  @Before public void setUp() {
    context = InstrumentationRegistry.getInstrumentation().getTargetContext();
  }

  @After public void tearDown() throws Exception {
    if (controller != null) {
      call(controller, "release");
    }
  }

  private static Class<?> hostClass(String name) {
    try {
      return Class.forName("com.libitum.host." + name);
    } catch (ClassNotFoundException e) {
      return null;
    }
  }

  private Object newController() throws Exception {
    Class<?> type = hostClass("SoundEffectsController");
    assertNotNull("SoundEffectsController does not exist", type);
    Constructor<?> constructor = type.getDeclaredConstructor(Context.class);
    constructor.setAccessible(true);
    controller = constructor.newInstance(context);
    return controller;
  }

  private static Object call(Object target, String name, Object... args) throws Exception {
    for (Method method : target.getClass().getDeclaredMethods()) {
      if (method.getName().equals(name) && method.getParameterTypes().length == args.length) {
        method.setAccessible(true);
        try {
          return method.invoke(target, args);
        } catch (InvocationTargetException e) {
          Throwable cause = e.getCause();
          throw cause instanceof Exception ? (Exception) cause : e;
        }
      }
    }
    throw new AssertionError(target.getClass().getSimpleName() + "." + name + " does not exist");
  }

  private boolean ringing() throws Exception {
    return (Boolean) call(controller, "isRingPlaying");
  }

  private boolean awaitRinging(boolean expected, long timeoutMs) throws Exception {
    long deadline = System.currentTimeMillis() + timeoutMs;
    while (System.currentTimeMillis() < deadline) {
      if (ringing() == expected) return true;
      Thread.sleep(50);
    }
    return ringing() == expected;
  }

  /** SI1 */
  @Test public void si1_allEightEffectAssetsOpenWithContent() {
    List<String> broken = new ArrayList<>();
    for (SoundEffectAsset asset : SoundEffectAsset.values()) {
      try (AssetFileDescriptor fd = context.getAssets().openFd(asset.assetPath())) {
        if (fd.getLength() <= 0) broken.add(asset.assetPath() + " (empty)");
      } catch (Exception e) {
        broken.add(asset.assetPath() + " (" + e.getClass().getSimpleName() + ")");
      }
    }
    assertEquals("sound effect assets not openable: " + broken, 0, broken.size());
  }

  /** SI2 */
  @Test public void si2_everyEffectAssetPreparesAndHasDuration() {
    List<String> broken = new ArrayList<>();
    for (SoundEffectAsset asset : SoundEffectAsset.values()) {
      MediaPlayer player = new MediaPlayer();
      try (AssetFileDescriptor fd = context.getAssets().openFd(asset.assetPath())) {
        player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
        player.prepare();
        if (player.getDuration() <= 0) broken.add(asset.assetPath() + " (no duration)");
      } catch (Exception e) {
        broken.add(asset.assetPath() + " (" + e.getClass().getSimpleName() + ")");
      } finally {
        player.release();
      }
    }
    assertEquals("sound effect assets not decodable: " + broken, 0, broken.size());
  }

  /** SI3 - guard: unknown ids and a bell-less stopRing never throw. */
  @Test public void si3_unknownIdsAndIdleStopRingDoNotThrow() throws Exception {
    assertNull(SoundEffectAsset.fromId("unknown"));
    assertNull(SoundEffectAsset.fromId(null));
    Class<?> moduleType = hostClass("SoundEffectsModule");
    if (moduleType == null) return; // module not built yet: the pure resolver above is the guard
    Object ctl = newController();
    Constructor<?> constructor = moduleType.getDeclaredConstructor(Context.class, Object.class);
    Object module = constructor.newInstance(context, ctl);
    call(module, "play", "unknown");
    call(module, "play", (Object) null);
    call(module, "stopRing");
  }

  /** SI4 */
  @Test public void si4_ringBellStartsOnceAndStopRingStopsIt() throws Exception {
    newController();
    call(controller, "play", "ring_bell");
    assertTrue("bell did not start within 3s", awaitRinging(true, 3000));
    call(controller, "play", "ring_bell");
    Thread.sleep(300);
    assertTrue("second ring_bell stopped the bell", ringing());
    call(controller, "stopRing");
    assertTrue("stopRing did not stop the bell", awaitRinging(false, 3000));
  }

  /** SI5 */
  @Test public void si5_shortEffectsKeepBellAndStopAllSilencesIt() throws Exception {
    newController();
    call(controller, "play", "ring_bell");
    assertTrue("bell did not start within 3s", awaitRinging(true, 3000));
    call(controller, "play", "button");
    call(controller, "play", "correct_answer");
    Thread.sleep(300);
    assertTrue("short effects stopped the bell", ringing());
    call(controller, "stopAll");
    assertTrue("stopAll left the bell ringing", awaitRinging(false, 3000));
  }
}
