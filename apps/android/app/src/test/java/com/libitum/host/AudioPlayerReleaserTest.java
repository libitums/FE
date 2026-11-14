package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

/** Sentry DURU-ANDROID-H · M: MediaPlayer.release() blocked the main thread on an HTTP disconnect. */
public final class AudioPlayerReleaserTest {
  private static final class RecordingExecutor implements java.util.concurrent.Executor {
    final List<Runnable> queued = new ArrayList<>();

    @Override public void execute(Runnable command) {
      queued.add(command);
    }

    void runAll() {
      List<Runnable> pending = new ArrayList<>(queued);
      queued.clear();
      for (Runnable command : pending) command.run();
    }
  }

  private final List<RuntimeException> errors = new ArrayList<>();

  // R1
  @Test public void releaseDoesNotRunOnTheCallingThread() {
    RecordingExecutor executor = new RecordingExecutor();
    int[] runs = new int[1];
    new AudioPlayerReleaser(executor, errors::add).release(() -> runs[0]++);
    assertEquals(0, runs[0]);
    assertEquals(1, executor.queued.size());
  }

  // R2
  @Test public void queuedReleaseRunsExactlyOnce() {
    RecordingExecutor executor = new RecordingExecutor();
    int[] runs = new int[1];
    new AudioPlayerReleaser(executor, errors::add).release(() -> runs[0]++);
    executor.runAll();
    executor.runAll();
    assertEquals(1, runs[0]);
  }

  // R3
  @Test public void releasesRunInSubmissionOrder() {
    RecordingExecutor executor = new RecordingExecutor();
    List<String> order = new ArrayList<>();
    AudioPlayerReleaser releaser = new AudioPlayerReleaser(executor, errors::add);
    releaser.release(() -> order.add("first"));
    releaser.release(() -> order.add("second"));
    executor.runAll();
    assertEquals(List.of("first", "second"), order);
  }

  // R4
  @Test public void failingReleaseIsReportedAndTheNextOneStillRuns() {
    RecordingExecutor executor = new RecordingExecutor();
    IllegalStateException failure = new IllegalStateException("released twice");
    int[] runs = new int[1];
    AudioPlayerReleaser releaser = new AudioPlayerReleaser(executor, errors::add);
    releaser.release(() -> {
      throw failure;
    });
    releaser.release(() -> runs[0]++);
    executor.runAll();
    assertEquals(1, errors.size());
    assertSame(failure, errors.get(0));
    assertEquals(1, runs[0]);
  }

  // R5
  @Test public void backgroundExecutorUsesADaemonAudioReleaseThread() throws InterruptedException {
    AtomicReference<Thread> ranOn = new AtomicReference<>();
    CountDownLatch done = new CountDownLatch(1);
    new AudioPlayerReleaser(AudioPlayerReleaser.backgroundExecutor(), errors::add).release(() -> {
      ranOn.set(Thread.currentThread());
      done.countDown();
    });
    assertTrue(done.await(5, TimeUnit.SECONDS));
    assertNotSame(Thread.currentThread(), ranOn.get());
    assertEquals("AudioRelease", ranOn.get().getName());
    assertTrue(ranOn.get().isDaemon());
  }

  // R6
  @Test public void blockedReleaseDoesNotBlockTheCaller() throws InterruptedException {
    CountDownLatch unblock = new CountDownLatch(1);
    CountDownLatch secondRan = new CountDownLatch(1);
    AudioPlayerReleaser releaser =
        new AudioPlayerReleaser(AudioPlayerReleaser.backgroundExecutor(), errors::add);
    Thread caller = new Thread(() -> {
      releaser.release(() -> {
        try {
          unblock.await(30, TimeUnit.SECONDS);
        } catch (InterruptedException ignored) {
          Thread.currentThread().interrupt();
        }
      });
      releaser.release(secondRan::countDown);
    });
    caller.start();
    caller.join(5000);
    boolean callerReturned = !caller.isAlive();
    unblock.countDown();
    caller.join();
    assertTrue("release() must return while an earlier release is still blocked", callerReturned);
    assertTrue(secondRan.await(5, TimeUnit.SECONDS));
  }
}
