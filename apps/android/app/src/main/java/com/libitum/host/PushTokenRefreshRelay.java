package com.libitum.host;

/**
 * In-process relay from the FCM service to the live Activity (no Android dependencies).
 *
 * <p>The signal must not outlive the process or wait for a listener, so nothing is queued: a
 * notification with no listener attached is dropped. {@code notifyRefreshed} arrives on the SDK
 * executor thread while {@code attach}/{@code detach} come from the main thread, so the listener
 * reference is read and written under a lock and every decision works on a single read of it.
 */
final class PushTokenRefreshRelay {
  interface Listener {
    void onPushTokenRefreshed();
  }

  static final PushTokenRefreshRelay PROCESS = new PushTokenRefreshRelay();

  private final Object lock = new Object();
  private Listener listener;

  /** Replaces the previous listener. Null is ignored. */
  void attach(Listener listener) {
    if (listener == null) return;
    synchronized (lock) {
      this.listener = listener;
    }
  }

  /**
   * Detaches only when the given listener is the one currently attached — a new Activity may attach
   * before the old one is destroyed, and the stale detach must not remove the replacement.
   */
  void detach(Listener listener) {
    synchronized (lock) {
      if (this.listener == listener) this.listener = null;
    }
  }

  /**
   * True when a listener received the notification, false when none is attached. A throwing listener
   * is swallowed so the service executor thread survives.
   */
  boolean notifyRefreshed() {
    Listener current;
    synchronized (lock) {
      current = listener;
    }
    if (current == null) return false;
    try {
      current.onPushTokenRefreshed();
    } catch (RuntimeException ignored) {
      // The relay never throws into the FCM service.
    }
    return true;
  }
}
