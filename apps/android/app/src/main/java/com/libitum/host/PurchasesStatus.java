package com.libitum.host;

/**
 * 구매 오류 → JS 답의 status(ADR-0144 「Android 결제 준비」). Play의 보류 결제(현금 · 편의점 결제 등 — RevenueCat `PaymentPendingError`)는
 * 실패가 아니다: 결제 시트가 보류 안내를 보이고, 사용자가 돈을 내면 RevenueCat이 구매를 받아 웹훅으로 서버에 보낸다. JS는 `pending`을
 * 취소처럼 조용히 끝낸다(실패 줄 · 확인 대기 · Order Complete 없음). 순수.
 */
final class PurchasesStatus {
  private PurchasesStatus() {}

  static String ofError(boolean userCancelled, boolean paymentPending) {
    if (userCancelled) return "cancelled";
    return paymentPending ? "pending" : "failed";
  }
}
