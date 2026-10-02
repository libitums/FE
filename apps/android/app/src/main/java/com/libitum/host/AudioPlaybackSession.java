package com.libitum.host;

/** Tracks the one playback completion callback that is still valid. */
final class AudioPlaybackSession {
  private long currentGeneration;
  private Runnable completion;

  long replace(Runnable completion) {
    currentGeneration++;
    this.completion = completion;
    return currentGeneration;
  }

  boolean isCurrent(long generation) {
    return generation == currentGeneration && completion != null;
  }

  void cancel() {
    currentGeneration++;
    completion = null;
  }

  void finish(long generation) {
    if (!isCurrent(generation)) return;
    Runnable callback = completion;
    completion = null;
    currentGeneration++;
    callback.run();
  }
}
