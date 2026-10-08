package com.libitum.host;

/**
 * Pure decision logic for the Android system back press (no Android dependencies).
 * All calls happen on the main thread.
 */
final class SystemBackGate {
  static final long ACK_TIMEOUT_MS = 500;

  enum Press { FINISH, DISPATCH, IGNORE }

  enum Resolution { NONE, MOVE_TO_BACK }

  private boolean ready;
  private long lastToken;
  private String pending;

  /** Idempotent. */
  void markReady() {
    ready = true;
  }

  /** DISPATCH means pendingToken() is a fresh token. */
  Press press() {
    if (!ready) {
      return Press.FINISH;
    }
    if (pending != null) {
      return Press.IGNORE;
    }
    lastToken += 1;
    pending = Long.toString(lastToken);
    return Press.DISPATCH;
  }

  /** Null when nothing is pending. */
  String pendingToken() {
    return pending;
  }

  Resolution respond(String token, String outcome) {
    if (!isPending(token)) {
      return Resolution.NONE;
    }
    if ("handled".equals(outcome)) {
      pending = null;
      return Resolution.NONE;
    }
    if ("leave".equals(outcome)) {
      pending = null;
      return Resolution.MOVE_TO_BACK;
    }
    // Unknown outcome: keep waiting; the timeout cleans up.
    return Resolution.NONE;
  }

  Resolution timeout(String token) {
    if (!isPending(token)) {
      return Resolution.NONE;
    }
    pending = null;
    return Resolution.MOVE_TO_BACK;
  }

  private boolean isPending(String token) {
    return pending != null && pending.equals(token);
  }
}
