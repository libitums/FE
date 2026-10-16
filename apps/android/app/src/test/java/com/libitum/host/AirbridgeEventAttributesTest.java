package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import com.lynx.react.bridge.JavaOnlyMap;
import java.util.Map;
import org.junit.Test;

/** N-A2: `AirbridgeEventAttributes.strings`는 문자열 값만 남긴다. */
public final class AirbridgeEventAttributesTest {
  @Test public void n_a2_keepsOnlyStringValues() {
    JavaOnlyMap nested = new JavaOnlyMap();
    nested.putString("inner", "x");
    JavaOnlyMap attributes = new JavaOnlyMap();
    attributes.putString("level", "appointment-confirmation");
    attributes.putString("label", "messenger");
    attributes.putInt("count", 3);
    attributes.putDouble("ratio", 0.5);
    attributes.putBoolean("flag", true);
    attributes.putMap("nested", nested);

    Map<String, String> result = AirbridgeEventAttributes.strings(attributes);

    assertEquals(2, result.size());
    assertEquals("appointment-confirmation", result.get("level"));
    assertEquals("messenger", result.get("label"));
  }

  @Test public void n_a2_nullAndEmptyInputsYieldAnEmptyMap() {
    Map<String, String> fromNull = AirbridgeEventAttributes.strings(null);
    assertNotNull(fromNull);
    assertTrue(fromNull.isEmpty());

    Map<String, String> fromEmpty = AirbridgeEventAttributes.strings(new JavaOnlyMap());
    assertNotNull(fromEmpty);
    assertTrue(fromEmpty.isEmpty());
  }
}
