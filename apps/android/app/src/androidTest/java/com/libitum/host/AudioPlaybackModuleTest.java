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
      "appointment-1", "appointment-2", "appointment-3",
      "directions-1", "directions-2", "directions-3",
      "greeting-1", "greeting-2", "greeting-3",
      "introduction-1", "introduction-2", "introduction-3",
      "ordering-1", "ordering-2", "ordering-3",
      "phone-call-confirm-01", "phone-call-confirm-02", "phone-call-confirm-03",
      "tutorial-cabin-announcement", "tutorial-minseo-call-01", "tutorial-minseo-call-02"
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
    Thread.sleep(400);
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT);
    assertFalse("speech completed during focus loss", complete.await(6, TimeUnit.SECONDS));
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_GAIN);
    assertTrue("speech did not resume after focus returned", complete.await(8, TimeUnit.SECONDS));
  }

  @Test public void permanentFocusLossSettlesPlayback() throws InterruptedException {
    CountDownLatch complete = new CountDownLatch(1);
    module.play("tutorial-cabin-announcement", args -> complete.countDown());
    Thread.sleep(400);
    playback.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS);
    assertTrue("permanent loss did not settle playback", complete.await(3, TimeUnit.SECONDS));
  }
}
