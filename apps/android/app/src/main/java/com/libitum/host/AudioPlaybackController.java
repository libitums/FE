package com.libitum.host;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import com.lynx.react.bridge.Callback;
import java.io.IOException;

/** Owns the Android player for one Lynx host activity. */
final class AudioPlaybackController {
  private final Context context;
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final AudioPlaybackSession session = new AudioPlaybackSession();
  private long currentGeneration;
  private MediaPlayer player;
  private boolean prepared;
  private boolean paused;
  private boolean foreground = true;

  AudioPlaybackController(Context context) {
    this.context = context.getApplicationContext();
  }

  void play(String source, Callback done) {
    onMain(() -> {
      releasePlayer();
      long generation = session.replace(() -> done.invoke((Object) null));
      currentGeneration = generation;
      if (!foreground) {
        session.finish(generation);
        return;
      }
      String path = AudioAssetPath.forSource(source);
      if (path == null) {
        session.finish(generation);
        return;
      }
      MediaPlayer next;
      try {
        next = new MediaPlayer();
      } catch (RuntimeException error) {
        session.finish(generation);
        return;
      }
      player = next;
      try (AssetFileDescriptor asset = context.getAssets().openFd(path)) {
        next.setDataSource(asset.getFileDescriptor(), asset.getStartOffset(), asset.getLength());
        next.setOnPreparedListener(ready -> {
          if (!session.isCurrent(generation) || player != ready) return;
          prepared = true;
          if (!paused) ready.start();
        });
        next.setOnCompletionListener(finished -> finish(generation, finished));
        next.setOnErrorListener((failed, what, extra) -> {
          finish(generation, failed);
          return true;
        });
        next.prepareAsync();
      } catch (IOException | RuntimeException error) {
        finish(generation, next);
      }
    });
  }

  void stop() {
    onMain(() -> {
      session.cancel();
      releasePlayer();
    });
  }

  void pause() {
    onMain(() -> {
      if (player == null) return;
      paused = true;
      if (prepared && player.isPlaying()) player.pause();
    });
  }

  void resume() {
    onMain(() -> {
      if (player == null) return;
      paused = false;
      if (prepared && !player.isPlaying()) player.start();
    });
  }

  /** Foreground-only playback: finish the current request when the host leaves the screen. */
  void interrupt() {
    onMain(() -> {
      foreground = false;
      MediaPlayer active = player;
      if (active != null) finishCurrent(active);
    });
  }

  void startHost() {
    onMain(() -> foreground = true);
  }

  private void finish(long generation, MediaPlayer completed) {
    if (player != completed || !session.isCurrent(generation)) return;
    releasePlayer();
    session.finish(generation);
  }

  private void finishCurrent(MediaPlayer completed) {
    if (player != completed) return;
    // The lifecycle interruption is a terminal event, so the Lynx controls can reset.
    releasePlayer();
    session.finish(currentGeneration);
  }

  private void releasePlayer() {
    MediaPlayer previous = player;
    player = null;
    prepared = false;
    paused = false;
    if (previous == null) return;
    previous.setOnPreparedListener(null);
    previous.setOnCompletionListener(null);
    previous.setOnErrorListener(null);
    previous.release();
  }

  private void onMain(Runnable action) {
    if (Looper.myLooper() == Looper.getMainLooper()) action.run();
    else mainHandler.post(action);
  }
}
