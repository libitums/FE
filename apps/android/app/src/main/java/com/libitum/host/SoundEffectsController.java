package com.libitum.host;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.SoundPool;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import java.io.IOException;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

/**
 * Plays the host sound effects: short ones through a SoundPool, the looping bell through a
 * MediaPlayer. Decisions come from {@link SoundEffectsSession}; this class only executes them.
 * It never requests audio focus, so it cannot pause the lesson speech that holds it.
 */
final class SoundEffectsController {
  private static final String TAG = "SoundEffects";
  private static final int SHORT_EFFECT_COUNT = 7;

  private final Context context;
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final SoundEffectsSession session = new SoundEffectsSession();
  private final AudioAttributes attributes;
  private final Map<SoundEffectAsset, Integer> sampleIds = new EnumMap<>(SoundEffectAsset.class);
  private final Map<Integer, SoundEffectAsset> assetsBySample = new HashMap<>();
  private final Map<SoundEffectAsset, Integer> streamIds = new EnumMap<>(SoundEffectAsset.class);
  private SoundPool soundPool;
  private volatile MediaPlayer bell;
  private volatile boolean bellPrepared;
  private boolean released;

  SoundEffectsController(Context context) {
    this.context = context.getApplicationContext();
    attributes = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build();
    onMain(this::loadAll);
  }

  void play(String id) {
    SoundEffectAsset asset = SoundEffectAsset.fromId(id);
    if (asset == null) return;
    onMain(() -> {
      if (released) return;
      switch (session.request(asset)) {
        case PLAY:
          playShort(asset);
          return;
        case START_RING:
          startBell();
          return;
        default:
          return;
      }
    });
  }

  void stopRing() {
    onMain(() -> {
      if (released) return;
      session.stopRing();
      pauseBell();
    });
  }

  void stopAll() {
    onMain(() -> {
      if (released) return;
      stopEverything();
    });
  }

  void release() {
    onMain(() -> {
      if (released) return;
      stopEverything();
      released = true;
      if (soundPool != null) {
        soundPool.release();
        soundPool = null;
      }
      releaseBell();
    });
  }

  /** For instrumentation tests. */
  boolean isRingPlaying() {
    MediaPlayer active = bell;
    if (active == null) return false;
    try {
      return bellPrepared && active.isPlaying();
    } catch (IllegalStateException error) {
      return false;
    }
  }

  private void loadAll() {
    if (released) return;
    soundPool = new SoundPool.Builder()
        .setMaxStreams(SHORT_EFFECT_COUNT)
        .setAudioAttributes(attributes)
        .build();
    soundPool.setOnLoadCompleteListener((pool, sampleId, status) -> onMain(() -> {
      SoundEffectAsset asset = assetsBySample.get(sampleId);
      if (asset == null || released) return;
      if (status != 0) {
        Log.w(TAG, "Cannot load sound effect " + asset.assetPath() + " status " + status);
        session.onLoadFailed(asset);
      } else if (session.onLoaded(asset)) {
        playShort(asset);
      }
    }));
    for (SoundEffectAsset asset : SoundEffectAsset.values()) {
      if (asset.loops()) {
        loadBell(asset);
        continue;
      }
      try (AssetFileDescriptor fd = context.getAssets().openFd(asset.assetPath())) {
        int sampleId = soundPool.load(fd, 1);
        sampleIds.put(asset, sampleId);
        assetsBySample.put(sampleId, asset);
      } catch (IOException | RuntimeException error) {
        Log.w(TAG, "Cannot load sound effect " + asset.assetPath(), error);
        session.onLoadFailed(asset);
      }
    }
  }

  private void loadBell(SoundEffectAsset asset) {
    MediaPlayer next = new MediaPlayer();
    bell = next;
    try (AssetFileDescriptor fd = context.getAssets().openFd(asset.assetPath())) {
      next.setAudioAttributes(attributes);
      next.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
      next.setLooping(true);
      next.setVolume(asset.volume(), asset.volume());
      next.setOnPreparedListener(ready -> {
        if (bell != ready || released) return;
        bellPrepared = true;
        if (session.onLoaded(asset)) startBell();
      });
      next.setOnErrorListener((failed, what, extra) -> {
        Log.w(TAG, "Sound effect player error " + what + "/" + extra);
        if (bell == failed) {
          releaseBell();
          session.onLoadFailed(asset);
        }
        return true;
      });
      next.prepareAsync();
    } catch (IOException | RuntimeException error) {
      Log.w(TAG, "Cannot load sound effect " + asset.assetPath(), error);
      releaseBell();
      session.onLoadFailed(asset);
    }
  }

  private void playShort(SoundEffectAsset asset) {
    Integer sample = sampleIds.get(asset);
    if (soundPool == null || sample == null) return;
    Integer previous = streamIds.get(asset);
    if (previous != null) soundPool.stop(previous);
    float volume = asset.volume();
    streamIds.put(asset, soundPool.play(sample, volume, volume, 1, 0, 1f));
  }

  private void startBell() {
    MediaPlayer active = bell;
    if (active == null || !bellPrepared) return;
    try {
      active.seekTo(0);
      active.start();
    } catch (IllegalStateException error) {
      Log.w(TAG, "Cannot start sound effect " + SoundEffectAsset.RING_BELL.assetPath(), error);
    }
  }

  private void pauseBell() {
    MediaPlayer active = bell;
    if (active == null || !bellPrepared) return;
    try {
      if (active.isPlaying()) {
        active.pause();
        active.seekTo(0);
      }
    } catch (IllegalStateException error) {
      // The player was released underneath us; nothing is playing.
    }
  }

  private void stopEverything() {
    session.stopAll();
    if (soundPool != null) {
      for (Integer stream : streamIds.values()) {
        if (stream != null) soundPool.stop(stream);
      }
    }
    streamIds.clear();
    pauseBell();
  }

  private void releaseBell() {
    MediaPlayer previous = bell;
    bell = null;
    bellPrepared = false;
    if (previous != null) {
      previous.setOnPreparedListener(null);
      previous.setOnErrorListener(null);
      previous.release();
    }
  }

  private void onMain(Runnable action) {
    if (Looper.myLooper() == Looper.getMainLooper()) action.run();
    else mainHandler.post(action);
  }
}
