package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Looper;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Sentry DURU-ANDROID-17: setDataSource() for a remote voice line blocked the main thread.
 * A slow opener stands in for a slow network / busy media server.
 */
@RunWith(AndroidJUnit4.class)
public final class AudioPrepareOffMainTest {
  private static final String SLOW = "https://slow.invalid/voice.m4a";
  private static final long BLOCK_MS = 3000;

  private final CountDownLatch unblock = new CountDownLatch(1);
  private final AtomicReference<Thread> openedOn = new AtomicReference<>();
  private Context context;
  private AudioPlaybackController playback;
  private AudioPlaybackModule module;

  @Before public void setUp() {
    context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    AudioAttributes speech = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build();
    AudioSourceOpener.Step real = AudioSourceOpener.forContext(context, speech);
    // 느린 원격 음성은 망이 늦은 것처럼 막혔다가, 풀리면 번들 음성으로 연다(망 없이 재생 확인).
    AudioSourceOpener.Step slow = (target, remote, local, assetPath) -> {
      openedOn.compareAndSet(null, Thread.currentThread());
      if (remote == null) {
        real.open(target, null, local, assetPath);
        return;
      }
      try {
        unblock.await(BLOCK_MS, TimeUnit.MILLISECONDS);
      } catch (InterruptedException error) {
        Thread.currentThread().interrupt();
      }
      real.open(target, null, null, AudioAssetPath.forSource("greeting-1"));
    };
    playback = new AudioPlaybackController(context, slow);
    module = new AudioPlaybackModule(context, playback);
  }

  @After public void tearDown() {
    unblock.countDown();
    playback.stop();
  }

  private long playOnMain(String source, AtomicInteger calls, CountDownLatch done) {
    long[] elapsed = new long[1];
    InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
      long start = SystemClock.elapsedRealtime();
      module.play(source, args -> {
        calls.incrementAndGet();
        done.countDown();
      });
      elapsed[0] = SystemClock.elapsedRealtime() - start;
    });
    return elapsed[0];
  }

  // I1 — 느린 원격 소스를 열어도 play()는 메인을 바로 돌려준다. 여는 일은 AudioPrepare 스레드.
  @Test public void i1_slowSourceDoesNotBlockTheMainThread() throws InterruptedException {
    AtomicInteger calls = new AtomicInteger();
    CountDownLatch done = new CountDownLatch(1);
    long elapsed = playOnMain(SLOW, calls, done);
    assertTrue("play() held the main thread for " + elapsed + " ms", elapsed < 500);
    unblock.countDown();
    assertTrue("slow voice did not finish", done.await(10, TimeUnit.SECONDS));
    assertNotSame(Looper.getMainLooper().getThread(), openedOn.get());
    assertEquals("AudioPrepare", openedOn.get().getName());
    Thread.sleep(300);
    assertEquals(1, calls.get());
  }

  // I2 — 여는 중 다른 음성 요청: 늦게 열린 앞 음성은 버려지고 콜백도 오지 않는다.
  @Test public void i2_lateOpenOfAReplacedRequestIsDiscarded() throws InterruptedException {
    AtomicInteger first = new AtomicInteger();
    AtomicInteger second = new AtomicInteger();
    CountDownLatch firstDone = new CountDownLatch(1);
    CountDownLatch secondDone = new CountDownLatch(1);
    playOnMain(SLOW, first, firstDone);
    playOnMain("greeting-1", second, secondDone);
    unblock.countDown();
    assertTrue("replacement did not finish", secondDone.await(10, TimeUnit.SECONDS));
    Thread.sleep(500);
    assertEquals(0, first.get());
    assertEquals(1, second.get());
  }

  // I3 — 여는 중 stop: 늦게 열려도 재생 · 콜백이 없다.
  @Test public void i3_stopWhileOpeningDiscardsTheLateResult() throws InterruptedException {
    AtomicInteger calls = new AtomicInteger();
    CountDownLatch done = new CountDownLatch(1);
    playOnMain(SLOW, calls, done);
    InstrumentationRegistry.getInstrumentation().runOnMainSync(module::stop);
    unblock.countDown();
    assertFalse("stopped voice still finished", done.await(1500, TimeUnit.MILLISECONDS));
    assertEquals(0, calls.get());
  }

  // I4 — 여는 중 화면 이탈: 끝 이벤트는 한 번만, 늦게 열린 결과는 두 번째 콜백을 만들지 않는다.
  @Test public void i4_leavingTheScreenWhileOpeningFinishesOnce() throws InterruptedException {
    AtomicInteger calls = new AtomicInteger();
    CountDownLatch done = new CountDownLatch(1);
    playOnMain(SLOW, calls, done);
    InstrumentationRegistry.getInstrumentation().runOnMainSync(playback::interrupt);
    assertTrue("interrupt did not settle the request", done.await(2, TimeUnit.SECONDS));
    unblock.countDown();
    Thread.sleep(800);
    assertEquals(1, calls.get());
    InstrumentationRegistry.getInstrumentation().runOnMainSync(playback::startHost);
  }

  // I5 — 같은 음성 연타: 마지막 요청만 끝 이벤트를 받는다.
  @Test public void i5_repeatedTapsFinishOnlyTheLastRequest() throws InterruptedException {
    AtomicInteger stale = new AtomicInteger();
    AtomicInteger last = new AtomicInteger();
    CountDownLatch lastDone = new CountDownLatch(1);
    playOnMain(SLOW, stale, new CountDownLatch(1));
    playOnMain(SLOW, stale, new CountDownLatch(1));
    playOnMain(SLOW, last, lastDone);
    unblock.countDown();
    assertTrue("last tap did not finish", lastDone.await(15, TimeUnit.SECONDS));
    Thread.sleep(500);
    assertEquals(0, stale.get());
    assertEquals(1, last.get());
  }

  // I6 — 여는 중 일시정지는 열린 뒤에도 지켜지고, resume하면 끝까지 재생된다.
  @Test public void i6_pauseWhileOpeningHoldsUntilResume() throws InterruptedException {
    AtomicInteger calls = new AtomicInteger();
    CountDownLatch done = new CountDownLatch(1);
    playOnMain(SLOW, calls, done);
    InstrumentationRegistry.getInstrumentation().runOnMainSync(playback::pause);
    unblock.countDown();
    assertFalse("paused voice played anyway", done.await(3, TimeUnit.SECONDS));
    InstrumentationRegistry.getInstrumentation().runOnMainSync(playback::resume);
    assertTrue("resumed voice did not finish", done.await(10, TimeUnit.SECONDS));
    assertEquals(1, calls.get());
  }
}
