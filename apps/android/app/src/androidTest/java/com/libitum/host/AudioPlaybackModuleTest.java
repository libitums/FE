package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioManager;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.IOException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class AudioPlaybackModuleTest {
  private static final String[] SOURCES = {
      "greeting-1", "ordering-2", "tutorial-cabin-announcement"
  };

  private Context context;
  private AudioPlaybackController playback;
  private AudioPlaybackModule module;

  @Before public void setUp() {
    context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    playback = new AudioPlaybackController(context);
    module = new AudioPlaybackModule(context, playback);
  }

  @After public void tearDown() {
    playback.stop();
  }

  @Test public void allCurrentContentIdsOpenAsUncompressedAudioAssets() throws IOException {
    for (String source : SOURCES) {
      try (AssetFileDescriptor asset = context.getAssets().openFd(AudioAssetPath.forSource(source))) {
        assertTrue(source + " is empty", asset.getLength() > 0);
      }
    }
  }

  /** AP2 */
  @Test public void ap2_missingAssetFinishesOnceAndLogsTheOpenFailure() throws Exception {
    Runtime.getRuntime().exec(new String[] {"logcat", "-c"}).waitFor();
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.play("missing-audio-probe", args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    assertTrue("missing asset did not settle", complete.await(3, TimeUnit.SECONDS));
    Thread.sleep(200);
    assertEquals(1, calls.get());
    Process logcat = Runtime.getRuntime().exec(new String[] {"logcat", "-d", "-s", "AudioPlayback:W"});
    StringBuilder log = new StringBuilder();
    try (java.io.BufferedReader reader = new java.io.BufferedReader(
        new java.io.InputStreamReader(logcat.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) log.append(line).append('\n');
    }
    logcat.waitFor();
    assertTrue("no open-failure warning in logcat: " + log,
        log.toString().contains("Cannot open audio asset audio/missing-audio-probe.m4a"));
  }

  @Test public void bundledAudioCompletesOnce() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.play("greeting-1", args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    assertTrue("bundled greeting did not finish", complete.await(10, TimeUnit.SECONDS));
    assertEquals(1, calls.get());
  }

  @Test public void invalidSourceFinishesWithoutOpeningAPath() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.play("../greeting-1", args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    assertTrue("invalid source did not settle", complete.await(3, TimeUnit.SECONDS));
    assertEquals(1, calls.get());
  }

  @Test public void replacingAudioDiscardsOldCompletion() throws InterruptedException {
    CountDownLatch newComplete = new CountDownLatch(1);
    AtomicInteger oldCalls = new AtomicInteger();
    module.play("tutorial-cabin-announcement", args -> oldCalls.incrementAndGet());
    Thread.sleep(400);
    module.play("greeting-1", args -> newComplete.countDown());
    assertTrue("replacement did not finish", newComplete.await(10, TimeUnit.SECONDS));
    assertEquals("replaced source completed", 0, oldCalls.get());
  }

  @Test public void pauseKeepsCompletionForResume() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    module.play("ordering-2", args -> complete.countDown());
    Thread.sleep(500);
    module.pause();
    assertFalse("paused source completed", complete.await(5, TimeUnit.SECONDS));
    module.resume();
    assertTrue("resumed source did not finish", complete.await(8, TimeUnit.SECONDS));
  }

  @Test public void stoppingAudioDiscardsCompletion() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    module.play("tutorial-cabin-announcement", args -> complete.countDown());
    Thread.sleep(400);
    module.stop();
    assertFalse("stopped source completed", complete.await(6, TimeUnit.SECONDS));
  }

  /** AP-R1 */
  @Test public void apR1_unreachableHttpsFinishesExactlyOnce() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.play("https://127.0.0.1:9/a.m4a", args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    assertTrue("unreachable remote did not settle", complete.await(10, TimeUnit.SECONDS));
    Thread.sleep(500);
    assertEquals(1, calls.get());
  }

  /** AP-R2 */
  @Test public void apR2_stoppingWhilePreparingRemoteDiscardsCompletion() throws InterruptedException {
    CountDownLatch remoteComplete = new CountDownLatch(1);
    module.play("https://127.0.0.1:9/a.m4a", args -> remoteComplete.countDown());
    module.stop();
    assertFalse("stopped remote completed", remoteComplete.await(1, TimeUnit.SECONDS));
    CountDownLatch bundledComplete = new CountDownLatch(1);
    AtomicInteger bundledCalls = new AtomicInteger();
    module.play("greeting-1", args -> {
      bundledCalls.incrementAndGet();
      bundledComplete.countDown();
    });
    assertTrue("bundled greeting did not finish", bundledComplete.await(10, TimeUnit.SECONDS));
    assertEquals(1, bundledCalls.get());
  }

  @Test public void backgroundInterruptionFinishesCurrentRequest() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.play("tutorial-cabin-announcement", args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    Thread.sleep(400);
    playback.interrupt();
    assertTrue("background interruption did not settle", complete.await(3, TimeUnit.SECONDS));
    assertEquals(1, calls.get());
  }

  @Test public void nullCompletionDoesNotCrashTheHost() throws InterruptedException {
    module.play("../invalid", null);
    Thread.sleep(200);
    CountDownLatch complete = new CountDownLatch(1);
    module.play("greeting-1", args -> complete.countDown());
    assertTrue("host stopped after null completion", complete.await(10, TimeUnit.SECONDS));
  }

  @Test public void transientFocusLossPausesSpeechUntilFocusReturns() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    module.play("tutorial-cabin-announcement", args -> complete.countDown());
    awaitPlaybackStarted();
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT);
    assertFalse("player still playing after transient loss", isPlayerPlaying(true));
    assertFalse("speech completed during focus loss", complete.await(6, TimeUnit.SECONDS));
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_GAIN);
    assertTrue("speech did not resume after focus returned", complete.await(8, TimeUnit.SECONDS));
  }

  @Test public void permanentFocusLossSettlesPlayback() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    module.play("tutorial-cabin-announcement", args -> complete.countDown());
    awaitPlaybackStarted();
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS);
    assertTrue("permanent loss did not settle playback", complete.await(3, TimeUnit.SECONDS));
  }

  /** Plays a bundled source until completion and returns the elapsed milliseconds. */
  private long elapsedMillis(String source, double rate) throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    long start = System.nanoTime();
    com.lynx.react.bridge.Callback done = args -> {
      calls.incrementAndGet();
      complete.countDown();
    };
    if (rate == 1.0) module.play(source, done);
    else module.playAtRate(source, rate, done);
    assertTrue(source + " at " + rate + " did not finish", complete.await(30, TimeUnit.SECONDS));
    long elapsed = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
    Thread.sleep(300);
    assertEquals("completion must arrive exactly once", 1, calls.get());
    return elapsed;
  }

  /** AP-S1 */
  @Test public void apS1_slowPlaybackCompletesOnceAndTakesLonger() throws InterruptedException {
    long normal = elapsedMillis("greeting-1", 1.0);
    long slow = elapsedMillis("greeting-1", 0.85);
    assertTrue("normal=" + normal + "ms slow=" + slow + "ms", slow >= normal * 1.1);
  }

  /** AP-S2 */
  @Test public void apS2_stopDuringSlowPlaybackDiscardsCompletion() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    module.playAtRate("tutorial-cabin-announcement", 0.85, args -> complete.countDown());
    awaitPlaybackStarted();
    module.stop();
    assertFalse("stopped slow source completed", complete.await(6, TimeUnit.SECONDS));
  }

  /** AP-S2 */
  @Test public void apS2_normalPlaybackReplacingSlowDiscardsTheOldCompletion()
      throws InterruptedException {
    CountDownLatch newComplete = new CountDownLatch(1);
    AtomicInteger oldCalls = new AtomicInteger();
    AtomicInteger newCalls = new AtomicInteger();
    module.playAtRate("tutorial-cabin-announcement", 0.85, args -> oldCalls.incrementAndGet());
    awaitPlaybackStarted();
    module.play("greeting-1", args -> {
      newCalls.incrementAndGet();
      newComplete.countDown();
    });
    assertTrue("replacement did not finish", newComplete.await(10, TimeUnit.SECONDS));
    Thread.sleep(300);
    assertEquals("replaced slow source completed", 0, oldCalls.get());
    assertEquals(1, newCalls.get());
  }

  /** AP-S3 */
  @Test public void apS3_pausedSlowPlaybackStaysPausedUntilResume() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.playAtRate("tutorial-cabin-announcement", 0.85, args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    awaitPlaybackStarted();
    module.pause();
    assertFalse("paused slow source completed", complete.await(600, TimeUnit.MILLISECONDS));
    assertFalse("player started on its own while paused", isPlayerPlaying(false));
    module.resume();
    awaitPlayerPlaying();
    assertEquals("speed lost after resume", 0.85f, playerSpeed(), 0.01f);
    assertTrue("resumed slow source did not finish", complete.await(30, TimeUnit.SECONDS));
    Thread.sleep(300);
    assertEquals(1, calls.get());
  }

  /** AP-S4 */
  @Test public void apS4_transientFocusLossPausesSlowPlaybackUntilFocusReturns()
      throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.playAtRate("tutorial-cabin-announcement", 0.85, args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    awaitPlaybackStarted();
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT);
    assertFalse("player still playing after transient loss", isPlayerPlaying(true));
    assertFalse("slow speech completed during focus loss", complete.await(6, TimeUnit.SECONDS));
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_GAIN);
    awaitPlayerPlaying();
    assertEquals("speed lost after focus returned", 0.85f, playerSpeed(), 0.01f);
    assertTrue("slow speech did not resume after focus returned", complete.await(30, TimeUnit.SECONDS));
    Thread.sleep(300);
    assertEquals(1, calls.get());
  }

  /** AP-S6: releasing the player puts the remembered speed back to normal. */
  @Test public void apS6_releasingThePlayerResetsTheRememberedSpeed() {
    module.playAtRate("tutorial-cabin-announcement", 0.85, args -> {});
    assertEquals(0.85f, rememberedRate(), 0.0001f);
    module.stop();
    assertEquals("stop must reset the speed", 1f, rememberedRate(), 0.0001f);
  }

  /** AP-S6 */
  @Test public void apS6_replacementByNormalPlaybackPlaysAtNormalSpeed() throws InterruptedException {
    module.playAtRate("tutorial-cabin-announcement", 0.85, args -> {});
    awaitPlaybackStarted();
    module.play("tutorial-cabin-announcement", args -> {});
    awaitPlaybackStarted();
    assertEquals(1f, playerSpeed(), 0.01f);
  }

  /** AP-S5 */
  @Test public void apS5_contentFileAtSlowRateCompletesOnceAndTakesLonger() throws Exception {
    java.io.File root = new java.io.File(context.getFilesDir(), ContentFileModule.ROOT_NAME);
    java.io.File copy = new java.io.File(root, "audio/ap-s5-greeting.m4a");
    java.io.File dir = copy.getParentFile();
    assertTrue("cannot create " + dir, dir.isDirectory() || dir.mkdirs());
    try (AssetFileDescriptor asset = context.getAssets().openFd(AudioAssetPath.forSource("greeting-1"));
        java.io.InputStream in = asset.createInputStream();
        java.io.OutputStream out = new java.io.FileOutputStream(copy)) {
      byte[] buffer = new byte[8192];
      int read;
      while ((read = in.read(buffer)) > 0) out.write(buffer, 0, read);
    }
    try {
      String source = "file://" + copy.getCanonicalPath();
      long normal = elapsedMillis(source, 1.0);
      long slow = elapsedMillis(source, 0.85);
      assertTrue("normal=" + normal + "ms slow=" + slow + "ms", slow >= normal * 1.1);
    } finally {
      copy.delete();
    }
  }

  /** AP-S5 */
  @Test public void apS5_unreachableHttpsAtSlowRateFinishesExactlyOnce() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    module.playAtRate("https://127.0.0.1:9/a.m4a", 0.85, args -> {
      calls.incrementAndGet();
      complete.countDown();
    });
    assertTrue("unreachable remote did not settle", complete.await(10, TimeUnit.SECONDS));
    Thread.sleep(500);
    assertEquals(1, calls.get());
  }

  /** The speed the live MediaPlayer is actually set to, read on the main thread. */
  private float playerSpeed() {
    float[] result = new float[1];
    InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
      try {
        java.lang.reflect.Field playerField = AudioPlaybackController.class.getDeclaredField("player");
        playerField.setAccessible(true);
        android.media.MediaPlayer active = (android.media.MediaPlayer) playerField.get(playback);
        if (active == null) throw new AssertionError("no player");
        result[0] = active.getPlaybackParams().getSpeed();
      } catch (ReflectiveOperationException error) {
        throw new AssertionError(error);
      }
    });
    return result[0];
  }

  /** The controller's remembered requested speed (what the next start would apply). */
  private float rememberedRate() {
    float[] result = new float[1];
    InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
      try {
        java.lang.reflect.Field rateField = AudioPlaybackController.class.getDeclaredField("currentRate");
        rateField.setAccessible(true);
        result[0] = rateField.getFloat(playback);
      } catch (ReflectiveOperationException error) {
        throw new AssertionError(error);
      }
    });
    return result[0];
  }

  private void awaitPlayerPlaying() throws InterruptedException {
    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
    while (System.nanoTime() < deadline) {
      if (isPlayerPlaying(false)) return;
      Thread.sleep(20);
    }
    throw new AssertionError("player did not resume playing within 5s");
  }

  /** Reads controller state on the main thread, which also drains earlier posted focus changes. */
  private boolean isPlayerPlaying(boolean requireFocusRequested) {
    boolean[] result = new boolean[1];
    InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
      try {
        java.lang.reflect.Field playerField = AudioPlaybackController.class.getDeclaredField("player");
        java.lang.reflect.Field focusField = AudioPlaybackController.class.getDeclaredField("focusRequested");
        playerField.setAccessible(true);
        focusField.setAccessible(true);
        android.media.MediaPlayer active = (android.media.MediaPlayer) playerField.get(playback);
        boolean focus = focusField.getBoolean(playback);
        result[0] = active != null && active.isPlaying() && (focus || !requireFocusRequested);
      } catch (ReflectiveOperationException error) {
        throw new AssertionError(error);
      }
    });
    return result[0];
  }

  /** Focus callbacks are ignored until playback requested focus, so wait for real playback. */
  private void awaitPlaybackStarted() throws InterruptedException {
    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
    while (System.nanoTime() < deadline) {
      if (isPlayerPlaying(true)) return;
      Thread.sleep(20);
    }
    throw new AssertionError("playback did not start (prepared, focus requested, playing) within 5s");
  }
}
