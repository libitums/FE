package com.libitum.host;

import java.util.EnumSet;
import java.util.Set;

/** Decides what a sound effect request should do; holds no players or stream ids. */
final class SoundEffectsSession {
  enum Play {
    PLAY,
    START_RING,
    ALREADY_RINGING,
    WAIT_FOR_LOAD,
    UNAVAILABLE
  }

  private final Set<SoundEffectAsset> loaded = EnumSet.noneOf(SoundEffectAsset.class);
  private final Set<SoundEffectAsset> failed = EnumSet.noneOf(SoundEffectAsset.class);
  private final Set<SoundEffectAsset> waiting = EnumSet.noneOf(SoundEffectAsset.class);
  private boolean ringing;

  Play request(SoundEffectAsset asset) {
    if (failed.contains(asset)) {
      return Play.UNAVAILABLE;
    }
    boolean bell = asset == SoundEffectAsset.RING_BELL;
    if (bell && ringing) {
      return Play.ALREADY_RINGING;
    }
    if (!loaded.contains(asset)) {
      waiting.add(asset);
      if (bell) {
        ringing = true;
      }
      return Play.WAIT_FOR_LOAD;
    }
    if (bell) {
      ringing = true;
      return Play.START_RING;
    }
    return Play.PLAY;
  }

  /** Marks the asset loaded; true once if a request was waiting, so the caller runs it now. */
  boolean onLoaded(SoundEffectAsset asset) {
    loaded.add(asset);
    return waiting.remove(asset);
  }

  void onLoadFailed(SoundEffectAsset asset) {
    failed.add(asset);
    waiting.remove(asset);
    if (asset == SoundEffectAsset.RING_BELL) {
      ringing = false;
    }
  }

  void stopRing() {
    ringing = false;
    waiting.remove(SoundEffectAsset.RING_BELL);
  }

  void stopAll() {
    ringing = false;
    waiting.clear();
  }

  boolean isRinging() {
    return ringing;
  }
}
