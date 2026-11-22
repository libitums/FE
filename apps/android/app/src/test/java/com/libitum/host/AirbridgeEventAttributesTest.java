package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import com.lynx.react.bridge.JavaOnlyArray;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;

/** N-A2: `AirbridgeEventAttributes.semantic`은 문자열 · 수 · 상품 줄 배열만 남긴다(2026-11-19 Order Complete). */
public final class AirbridgeEventAttributesTest {
  @Test public void n_a2_keepsStringsNumbersAndProductRows() {
    JavaOnlyMap nested = new JavaOnlyMap();
    nested.putString("inner", "x");
    JavaOnlyMap row = new JavaOnlyMap();
    row.putString("productID", "duru.coins.1200.v1");
    row.putDouble("price", 4.99);
    row.putInt("quantity", 1);
    row.putBoolean("flag", false);
    JavaOnlyArray products = new JavaOnlyArray();
    products.pushMap(row);
    products.pushString("not-a-row");
    JavaOnlyMap attributes = new JavaOnlyMap();
    attributes.putString("level", "appointment-confirmation");
    attributes.putInt("count", 3);
    attributes.putDouble("ratio", 0.5);
    attributes.putBoolean("flag", true);
    attributes.putMap("nested", nested);
    attributes.putArray("products", products);

    Map<String, Object> result = AirbridgeEventAttributes.semantic(attributes);

    assertEquals(4, result.size());
    assertEquals("appointment-confirmation", result.get("level"));
    assertEquals(3.0, (Double) result.get("count"), 0.0);
    assertEquals(0.5, (Double) result.get("ratio"), 0.0);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("products");
    assertEquals(1, rows.size());
    assertEquals(3, rows.get(0).size());
    assertEquals("duru.coins.1200.v1", rows.get(0).get("productID"));
    assertEquals(4.99, (Double) rows.get(0).get("price"), 0.0);
    assertEquals(1.0, (Double) rows.get(0).get("quantity"), 0.0);
  }

  @Test public void n_a2_nullAndEmptyInputsYieldAnEmptyMap() {
    Map<String, Object> fromNull = AirbridgeEventAttributes.semantic(null);
    assertNotNull(fromNull);
    assertTrue(fromNull.isEmpty());

    Map<String, Object> fromEmpty = AirbridgeEventAttributes.semantic(new JavaOnlyMap());
    assertNotNull(fromEmpty);
    assertTrue(fromEmpty.isEmpty());
  }
}
