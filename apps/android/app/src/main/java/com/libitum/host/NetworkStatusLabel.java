package com.libitum.host;

/**
 * `NetworkStatusModule.current()`가 돌려줄 `"<transport>:<cost>"`를 정하는 순수 분류입니다(ADR-0096 D1).
 * 플랫폼 API와 떨어져 있어 JUnit이 표 전체를 잽니다. JS가 모르는 값은 `unknown`으로 읽습니다.
 */
final class NetworkStatusLabel {
  static final String UNKNOWN = "unknown:unknown";

  private NetworkStatusLabel() {}

  static String offline() {
    return "offline:unknown";
  }

  /**
   * 기본 네트워크의 능력으로 나눕니다. 전송 수단은 Wi-Fi → 셀룰러 → 이더넷 순으로 보고(VPN이면 밑의 수단이 같이
   * 보입니다) 그 밖은 `other`. 데이터 절약 모드는 요금제 네트워크에만 걸리므로 `NOT_METERED`가 없을 때만 봅니다.
   */
  static String of(boolean wifi, boolean cellular, boolean ethernet, boolean notMetered,
      boolean restrictBackground) {
    String transport = wifi ? "wifi" : cellular ? "cellular" : ethernet ? "ethernet" : "other";
    String cost = notMetered ? "unmetered" : restrictBackground ? "constrained" : "metered";
    return transport + ":" + cost;
  }
}
