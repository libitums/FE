package com.libitum.host;

/** The host sound effects JS may request; ids, volumes and looping mirror the iOS asset table. */
enum SoundEffectAsset {
  BUTTON("button", 0.25f),
  CORRECT_ANSWER("correct_answer", 0.5f),
  WRONG_ANSWER("wrong_answer", 0.5f),
  LESSON_COMPLETE("lesson_complete", 0.55f),
  PASS_LESSON("pass_lesson", 0.55f),
  FAILED_LESSON("failed_lesson", 0.55f),
  RING_BELL("ring_bell", 0.35f),
  ACCEPT_CALL("accept_call", 0.4f);

  private final String id;
  private final float volume;

  SoundEffectAsset(String id, float volume) {
    this.id = id;
    this.volume = volume;
  }

  String id() {
    return id;
  }

  String assetPath() {
    return "sfx/" + id + ".mp3";
  }

  float volume() {
    return volume;
  }

  boolean loops() {
    return this == RING_BELL;
  }

  /** Resolves only an id exactly equal to {@link #id()}; anything else is ignored by callers. */
  static SoundEffectAsset fromId(String id) {
    if (id == null) {
      return null;
    }
    for (SoundEffectAsset asset : values()) {
      if (asset.id.equals(id)) {
        return asset;
      }
    }
    return null;
  }
}
