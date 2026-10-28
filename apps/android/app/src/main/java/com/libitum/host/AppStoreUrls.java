package com.libitum.host;

/**
 * Google Play의 이 앱 페이지 주소입니다(ADR-0086) — Lynx에 노출되는 유일한 목적지이고 JS에게서 주소를 받지
 * 않습니다(`LegalDocumentUrls`와 같은 경계). Play 앱이 없으면 웹 주소로 물러섭니다.
 */
final class AppStoreUrls {
  private AppStoreUrls() {}

  /** Play 앱이 여는 주소입니다. 패키지 이름이 비어 있으면 null. */
  static String market(String applicationId) {
    if (applicationId == null || applicationId.isEmpty()) return null;
    return "market://details?id=" + applicationId;
  }

  /** Play 앱이 없을 때 브라우저가 여는 주소입니다. 패키지 이름이 비어 있으면 null. */
  static String web(String applicationId) {
    if (applicationId == null || applicationId.isEmpty()) return null;
    return "https://play.google.com/store/apps/details?id=" + applicationId;
  }
}
