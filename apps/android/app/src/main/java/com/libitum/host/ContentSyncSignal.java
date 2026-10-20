package com.libitum.host;

/**
 * 전역 이벤트 `contentSyncOpportunity`를 보낼지 가르는 상태기계입니다(보내는 일은 MainActivity가 합니다).
 * 보내는 때: 기본 네트워크가 「없음 → 있음」으로 바뀔 때, 앱이 포그라운드로 돌아올 때(onStart 두 번째 이후).
 * 실행 시작은 JS가 스스로 도니, 등록 직후의 첫 상태 보고와 첫 onStart는 보내지 않습니다.
 */
final class ContentSyncSignal {
  private static final Object INITIAL = new Object();
  private Object current;
  private boolean started;

  /** @param initiallyAvailable 콜백을 등록하는 시점에 기본 네트워크가 이미 있었는지 */
  ContentSyncSignal(boolean initiallyAvailable) {
    current = initiallyAvailable ? INITIAL : null;
  }

  /** 기본 네트워크가 잡혔다. 직전에 없던 상태였을 때만 true. */
  synchronized boolean onNetworkAvailable(Object network) {
    boolean wasDown = current == null;
    current = network;
    return wasDown;
  }

  /** 네트워크를 잃었다. 지금 쓰던 네트워크가 아니면(기본 네트워크가 바뀐 뒤의 옛 것) 무시한다. */
  synchronized void onNetworkLost(Object network) {
    if (current == network) current = null;
  }

  /** 포그라운드 복귀. 첫 onStart(실행 시작)는 false. */
  synchronized boolean onStart() {
    boolean returning = started;
    started = true;
    return returning;
  }
}
