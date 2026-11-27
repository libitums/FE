package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

/** Sentry DURU-ANDROID-17: MediaPlayer.setDataSource() blocked the main thread (foreground ANR). */
public final class AudioPrepareQueueTest {
  private static final class RecordingExecutor implements Executor {
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

  private final RecordingExecutor background = new RecordingExecutor();
  private final RecordingExecutor main = new RecordingExecutor();
  private final AudioPrepareQueue<String> queue = new AudioPrepareQueue<>(background, main);
  private final List<String> events = new ArrayList<>();

  private void attach(long ticket, String target) {
    queue.attach(ticket, target,
        value -> events.add("attach:" + value),
        value -> events.add("ready:" + value),
        (value, error) -> events.add("failed:" + value + ":" + error.getMessage()),
        value -> events.add("stale:" + value));
  }

  // P1 — 준비(setDataSource)는 부르는 스레드(메인)에서 돌지 않는다.
  @Test public void attachDoesNotRunOnTheCallingThread() {
    attach(queue.begin(), "a");
    assertEquals(List.of(), events);
    assertEquals(1, background.queued.size());
    assertEquals(0, main.queued.size());
  }

  // P2 — 결과는 메인 실행기로 되돌아와서만 전달된다.
  @Test public void resultIsDeliveredOnlyThroughTheMainExecutor() {
    attach(queue.begin(), "a");
    background.runAll();
    assertEquals(List.of("attach:a"), events);
    assertEquals(1, main.queued.size());
    main.runAll();
    assertEquals(List.of("attach:a", "ready:a"), events);
  }

  // P3 — 준비 중 다른 요청이 오면 늦게 끝난 앞 결과는 버린다(재생하지 않고 해제 쪽으로).
  @Test public void lateResultOfAReplacedRequestIsDiscarded() {
    long first = queue.begin();
    attach(first, "a");
    long second = queue.begin();
    attach(second, "b");
    background.runAll();
    main.runAll();
    assertEquals(List.of("attach:a", "attach:b", "stale:a", "ready:b"), events);
  }

  // P4 — 준비 중 stop · 화면 이탈(cancel) 뒤에 온 결과도 버린다.
  @Test public void resultAfterCancelIsDiscarded() {
    attach(queue.begin(), "a");
    background.runAll();
    queue.cancel();
    main.runAll();
    assertEquals(List.of("attach:a", "stale:a"), events);
  }

  // P5 — 같은 오디오 연타: 마지막 요청만 살아남는다.
  @Test public void repeatedTapsKeepOnlyTheLastRequest() {
    for (int i = 0; i < 3; i++) attach(queue.begin(), "same" + i);
    background.runAll();
    main.runAll();
    assertEquals(List.of("attach:same0", "attach:same1", "attach:same2",
        "stale:same0", "stale:same1", "ready:same2"), events);
  }

  // P6 — 준비 실패는 현재 요청이면 failed, 이미 버려진 요청이면 stale로만 간다.
  @Test public void failureIsReportedOnlyForTheCurrentRequest() {
    IOException missing = new IOException("missing");
    long first = queue.begin();
    queue.attach(first, "a", value -> {
      throw missing;
    }, value -> events.add("ready:" + value),
        (value, error) -> events.add("failed:" + value + ":" + error.getMessage()),
        value -> events.add("stale:" + value));
    background.runAll();
    main.runAll();
    assertEquals(List.of("failed:a:missing"), events);

    events.clear();
    long second = queue.begin();
    queue.attach(second, "b", value -> {
      throw missing;
    }, value -> events.add("ready:" + value),
        (value, error) -> events.add("failed:" + value),
        value -> events.add("stale:" + value));
    queue.cancel();
    background.runAll();
    main.runAll();
    assertEquals(List.of("stale:b"), events);
  }

  // P7 — 전용 데몬 스레드에서 돈다.
  @Test public void backgroundExecutorUsesADaemonAudioPrepareThread() throws InterruptedException {
    AtomicReference<Thread> ranOn = new AtomicReference<>();
    CountDownLatch done = new CountDownLatch(1);
    AudioPrepareQueue.backgroundExecutor().execute(() -> {
      ranOn.set(Thread.currentThread());
      done.countDown();
    });
    assertTrue(done.await(5, TimeUnit.SECONDS));
    assertNotSame(Thread.currentThread(), ranOn.get());
    assertEquals("AudioPrepare", ranOn.get().getName());
    assertTrue(ranOn.get().isDaemon());
  }

  // P8 — 앞 준비가 망에서 막혀 있어도 attach 호출은 바로 돌아온다.
  @Test public void blockedAttachDoesNotBlockTheCaller() throws InterruptedException {
    CountDownLatch unblock = new CountDownLatch(1);
    AudioPrepareQueue<String> real =
        new AudioPrepareQueue<>(AudioPrepareQueue.backgroundExecutor(), main);
    AtomicReference<String> attached = new AtomicReference<>();
    Thread caller = new Thread(() -> real.attach(real.begin(), "slow", value -> {
      unblock.await(30, TimeUnit.SECONDS);
      attached.set(value);
    }, value -> { }, (value, error) -> { }, value -> { }));
    caller.start();
    caller.join(5000);
    boolean callerReturned = !caller.isAlive();
    unblock.countDown();
    caller.join();
    assertTrue("attach() must return while setDataSource is still blocked", callerReturned);
  }
}
