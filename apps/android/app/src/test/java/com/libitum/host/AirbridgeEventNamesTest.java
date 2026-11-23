package com.libitum.host;

import static org.junit.Assert.assertEquals;

import co.ab180.airbridge.common.AirbridgeAttribute;
import co.ab180.airbridge.common.AirbridgeCategory;
import org.junit.Test;

/** N-A3: JS 계약의 와이어 값 넷이 SDK 상수와 같다. 다르면 계약을 정정한다(docs/adr/0063-airbridge-events.md). */
public final class AirbridgeEventNamesTest {
  @Test public void n_a3_wireNamesMatchSdkConstants() {
    assertEquals("airbridge.user.signup", AirbridgeCategory.SIGN_UP);
    assertEquals("airbridge.achieveLevel", AirbridgeCategory.ACHIEVE_LEVEL);
    assertEquals("level", AirbridgeAttribute.LEVEL);
    assertEquals("label", AirbridgeAttribute.LABEL);
    // 2026-11-19 엽전 팩 결제 Order Complete.
    assertEquals("airbridge.ecommerce.order.completed", AirbridgeCategory.ORDER_COMPLETED);
    assertEquals("value", AirbridgeAttribute.VALUE);
    assertEquals("currency", AirbridgeAttribute.CURRENCY);
    assertEquals("transactionID", AirbridgeAttribute.TRANSACTION_ID);
    assertEquals("products", AirbridgeAttribute.PRODUCTS);
    assertEquals("productID", AirbridgeAttribute.PRODUCT_ID);
    assertEquals("name", AirbridgeAttribute.PRODUCT_NAME);
    assertEquals("price", AirbridgeAttribute.PRODUCT_PRICE);
    assertEquals("quantity", AirbridgeAttribute.PRODUCT_QUANTITY);
    assertEquals("currency", AirbridgeAttribute.PRODUCT_CURRENCY);
  }
}
