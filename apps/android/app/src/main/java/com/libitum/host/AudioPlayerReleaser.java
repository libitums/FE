package com.libitum.host;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * Hands MediaPlayer.release() off the calling thread.
 *
 * <p>For a streamed (https) source, release() waits for MediaHTTPConnection.disconnect(), which
 * blocked the main thread long enough to raise ANRs (Sentry DURU-ANDROID-H · M).
 */
final class AudioPlayerReleaser {
  interface ErrorSink {
    void report(RuntimeException error);
  }

  private static final class Holder {
    static final Executor BACKGROUND = Executors.newSingleThreadExecutor(task -> {
      Thread thread = new Thread(task, "AudioRelease");
      thread.setDaemon(true);
      return thread;
    });
  }

  private final Executor executor;
  private final ErrorSink onError;

  AudioPlayerReleaser(Executor executor, ErrorSink onError) {
    this.executor = executor;
    this.onError = onError;
  }

  /** Queues the release; it never runs on the calling thread. */
  void release(Runnable action) {
    if (action == null) return;
    executor.execute(() -> {
      try {
        action.run();
      } catch (RuntimeException error) {
        onError.report(error);
      }
    });
  }

  /** One shared daemon thread, so releases run one at a time in the order they were queued. */
  static Executor backgroundExecutor() {
    return Holder.BACKGROUND;
  }
}
