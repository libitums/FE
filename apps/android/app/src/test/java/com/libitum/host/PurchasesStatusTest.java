package com.libitum.host;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/**
 * PST-1: 구매 오류 → JS 답의 status. Play 보류 결제(현금 · 편의점 등 `PaymentPendingError`)는 실패가 아니다 — 결제가 끝나면
 * RevenueCat이 서버로 보낸다.
 */
public final class PurchasesStatusTest {
  @Test public void pst1_errorStatus() {
    assertEquals("cancelled", PurchasesStatus.ofError(true, false));
    assertEquals("pending", PurchasesStatus.ofError(false, true));
    assertEquals("failed", PurchasesStatus.ofError(false, false));
    // 취소가 먼저다 — 보류 결제 시트를 사용자가 닫은 것.
    assertEquals("cancelled", PurchasesStatus.ofError(true, true));
  }
}
