package com.libitum.host;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * Runs the blocking part of opening an audio source off the main thread and hands the result back.
 *
 * <p>MediaPlayer.setDataSource() waits in JNI until the media server has the source. On low-end
 * devices with a slow network that held the main thread long enough to raise a foreground ANR
 * (Sentry DURU-ANDROID-17). Each request gets a ticket; a result whose ticket is no longer current
 * (stop, another request, leaving the screen, repeated taps) goes to {@code onStale} instead.
 *
 * <p>{@link #begin()}, {@link #cancel()} and every callback run on the main executor only.
 */
final class AudioPrepareQueue<T> {
  interface Attach<T> {
    void run(T target) throws Exception;
  }

  interface Ready<T> {
    void accept(T target);
  }

  interface Failed<T> {
    void accept(T target, Exception error);
  }

  /** Enough that one open hung on the network does not stall the next tap; tickets make order moot. */
  private static final int THREADS = 3;

  private static final class Holder {
    static final Executor BACKGROUND = Executors.newFixedThreadPool(THREADS, task -> {
      Thread thread = new Thread(task, "AudioPrepare");
      thread.setDaemon(true);
      return thread;
    });
  }

  private final Executor background;
  private final Executor main;
  /** Written on main only; read on the prepare threads to skip requests that went stale in line. */
  private volatile long currentTicket;

  AudioPrepareQueue(Executor background, Executor main) {
    this.background = background;
    this.main = main;
  }

  /** Starts a new request; every earlier ticket becomes stale. */
  long begin() {
    return ++currentTicket;
  }

  /** Makes every pending ticket stale without starting a new request. */
  void cancel() {
    currentTicket++;
  }

  /** Queues {@code attach} on the background executor; the outcome comes back on the main one. */
  void attach(long ticket, T target, Attach<T> attach, Ready<T> onReady, Failed<T> onFailed,
      Ready<T> onStale) {
    background.execute(() -> {
      if (ticket != currentTicket) {
        // 차례를 기다리는 동안 버려졌다 — 열지 않고 바로 해제 쪽으로(대기열에 플레이어가 쌓이지 않게).
        main.execute(() -> onStale.accept(target));
        return;
      }
      Exception failure = null;
      try {
        attach.run(target);
      } catch (Exception error) {
        failure = error;
      }
      Exception outcome = failure;
      main.execute(() -> {
        if (ticket != currentTicket) onStale.accept(target);
        else if (outcome != null) onFailed.accept(target, outcome);
        else onReady.accept(target);
      });
    });
  }

  /** A few shared daemon threads named AudioPrepare; a late or out-of-order result is just stale. */
  static Executor backgroundExecutor() {
    return Holder.BACKGROUND;
  }
}
