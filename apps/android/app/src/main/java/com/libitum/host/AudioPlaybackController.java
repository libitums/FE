package com.libitum.host;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.lynx.react.bridge.Callback;
import java.io.IOException;

/** Owns the Android player for one Lynx host activity. */
final class AudioPlaybackController {
  private static final String TAG = "AudioPlayback";
  private final Context context;
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final AudioPlaybackSession session = new AudioPlaybackSession();
  private final AudioManager audioManager;
  private final AudioAttributes audioAttributes;
  private final AudioFocusRequest focusRequest;
  private long currentGeneration;
  private MediaPlayer player;
  private boolean prepared;
  private boolean paused;
  private boolean foreground = true;
  private boolean focusRequested;
  private boolean focusHeld;
  private boolean resumeAfterFocusGain;

  AudioPlaybackController(Context context) {
    this.context = context.getApplicationContext();
    audioManager = (AudioManager) this.context.getSystemService(Context.AUDIO_SERVICE);
    audioAttributes = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build();
    focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(audioAttributes)
        .setWillPauseWhenDucked(true)
        .setOnAudioFocusChangeListener(this::onAudioFocusChange, mainHandler)
        .build();
  }

  void play(String source, Callback done) {
    onMain(() -> {
      releasePlayer();
      long generation = session.replace(() -> {
        if (done != null) done.invoke((Object) null);
      });
      currentGeneration = generation;
      if (!foreground) {
        session.finish(generation);
        return;
      }
      String path = AudioAssetPath.forSource(source);
      if (path == null) {
        Log.w(TAG, "Rejected audio source " + source);
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
        next.setAudioAttributes(audioAttributes);
        next.setDataSource(asset.getFileDescriptor(), asset.getStartOffset(), asset.getLength());
        next.setOnPreparedListener(ready -> {
          if (!session.isCurrent(generation) || player != ready) return;
          prepared = true;
          if (!paused && !(resumeAfterFocusGain && !focusHeld)) startOrFinish(ready, generation);
        });
        next.setOnCompletionListener(finished -> finish(generation, finished));
        next.setOnErrorListener((failed, what, extra) -> {
          Log.w(TAG, "Audio playback error " + what + "/" + extra);
          finish(generation, failed);
          return true;
        });
        next.prepareAsync();
      } catch (IOException | RuntimeException error) {
        Log.w(TAG, "Cannot open audio asset " + path, error);
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
      resumeAfterFocusGain = false;
      if (prepared && player.isPlaying()) player.pause();
    });
  }

  void resume() {
    onMain(() -> {
      if (player == null) return;
      paused = false;
      resumeAfterFocusGain = false;
      if (prepared && !player.isPlaying()) startOrFinish(player, currentGeneration);
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

  void onAudioFocusChange(int change) {
    onMain(() -> {
      MediaPlayer active = player;
      if (active == null || !focusRequested) return;
      switch (change) {
        case AudioManager.AUDIOFOCUS_LOSS:
          finishCurrent(active);
          return;
        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
          focusHeld = false;
          resumeAfterFocusGain = !paused;
          if (prepared && active.isPlaying()) active.pause();
          return;
        case AudioManager.AUDIOFOCUS_GAIN:
          focusHeld = true;
          if (resumeAfterFocusGain && !paused && prepared) {
            resumeAfterFocusGain = false;
            startOrFinish(active, currentGeneration);
          }
          return;
        default:
          return;
      }
    });
  }

  private void startOrFinish(MediaPlayer active, long generation) {
    if (!requestFocus()) {
      finish(generation, active);
      return;
    }
    try {
      active.start();
    } catch (RuntimeException error) {
      finish(generation, active);
    }
  }

  private boolean requestFocus() {
    if (focusHeld) return true;
    if (audioManager == null) return false;
    try {
      if (audioManager.requestAudioFocus(focusRequest) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
        return false;
      }
    } catch (RuntimeException error) {
      return false;
    }
    focusRequested = true;
    focusHeld = true;
    return true;
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
    resumeAfterFocusGain = false;
    if (previous != null) {
      previous.setOnPreparedListener(null);
      previous.setOnCompletionListener(null);
      previous.setOnErrorListener(null);
      previous.release();
    }
    boolean requested = focusRequested;
    focusRequested = false;
    focusHeld = false;
    if (requested && audioManager != null) {
      audioManager.abandonAudioFocusRequest(focusRequest);
    }
  }

  private void onMain(Runnable action) {
    if (Looper.myLooper() == Looper.getMainLooper()) action.run();
    else mainHandler.post(action);
  }
}
