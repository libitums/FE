package com.libitum.host;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import java.io.File;
import java.io.IOException;

/** Opens one validated audio source. Runs on the AudioPrepare thread, never on main. */
final class AudioSourceOpener {
  /** The controller's seam; instrumentation tests swap in a slow or recording opener. */
  interface Step {
    void open(MediaPlayer target, String remote, File local, String assetPath) throws IOException;
  }

  private AudioSourceOpener() {}

  static Step forContext(Context context, AudioAttributes attributes) {
    return (target, remote, local, assetPath) ->
        open(context, target, attributes, remote, local, assetPath);
  }

  static void open(Context context, MediaPlayer target, AudioAttributes attributes, String remote,
      File local, String assetPath) throws IOException {
    target.setAudioAttributes(attributes);
    if (remote != null) {
      target.setDataSource(remote);
      return;
    }
    if (local != null) {
      target.setDataSource(local.getPath());
      return;
    }
    try (AssetFileDescriptor asset = context.getAssets().openFd(assetPath)) {
      target.setDataSource(asset.getFileDescriptor(), asset.getStartOffset(), asset.getLength());
    }
  }
}
