package com.libitum.host;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Foreground chat pushes (ADR-0200 revision). While the Activity is resumed, a push whose target is a
 * character's room ({@code companion-chat}, not a friend-story alert) goes to JS as an in-app toast
 * instead of a system notification. Everything else keeps the notification.
 *
 * <p>No Android dependencies: the FCM service thread delivers, the main thread attaches on resume and
 * detaches on pause. Nothing is queued — with no listener the caller posts the notification.
 */
final class ForegroundPush {
  private ForegroundPush() {}

  interface Listener {
    void onChatPush(String characterId);
  }

  static final Relay PROCESS = new Relay();

  /** The character id when this target is a chat message; null keeps the notification. JS re-validates. */
  static String chatCharacterId(String targetJson) {
    if (targetJson == null) return null;
    try {
      JSONObject target = new JSONObject(targetJson);
      if (!"companion-chat".equals(target.opt("kind"))) return null;
      if (Boolean.TRUE.equals(target.opt("story"))) return null;
      Object id = target.opt("characterId");
      if (!(id instanceof String)) return null;
      String characterId = (String) id;
      return characterId.isEmpty() || characterId.length() > 64 ? null : characterId;
    } catch (JSONException error) {
      return null;
    }
  }

  static final class Relay {
    private final Object lock = new Object();
    private Listener listener;

    /** Replaces the previous listener. Null is ignored. */
    void attach(Listener listener) {
      if (listener == null) return;
      synchronized (lock) {
        this.listener = listener;
      }
    }

    /** Detaches only the listener currently attached, so a stale detach keeps the replacement. */
    void detach(Listener listener) {
      synchronized (lock) {
        if (this.listener == listener) this.listener = null;
      }
    }

    /** True when the app is in front and took the push; a throwing listener is swallowed. */
    boolean deliver(String characterId) {
      Listener current;
      synchronized (lock) {
        current = listener;
      }
      if (current == null) return false;
      try {
        current.onChatPush(characterId);
      } catch (RuntimeException ignored) {
        // The relay never throws into the FCM service.
      }
      return true;
    }
  }
}
