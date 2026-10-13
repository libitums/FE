package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import com.lynx.react.bridge.JavaOnlyMap;
import java.util.Map;
import org.junit.Test;

/** N-A2: `MetaAppEventParameters.strings`는 문자열 값만 남긴다. */
public final class MetaAppEventParametersTest {
  @Test public void n_a2_keepsOnlyStringValues() {
    JavaOnlyMap nested = new JavaOnlyMap();
    nested.putString("inner", "x");
    JavaOnlyMap parameters = new JavaOnlyMap();
    parameters.putString("fb_level", "appointment-confirmation");
    parameters.putString("fb_content_type", "messenger");
    parameters.putInt("count", 3);
    parameters.putDouble("ratio", 0.5);
    parameters.putBoolean("flag", true);
    parameters.putMap("nested", nested);

    Map<String, String> result = MetaAppEventParameters.strings(parameters);

    assertEquals(2, result.size());
    assertEquals("appointment-confirmation", result.get("fb_level"));
    assertEquals("messenger", result.get("fb_content_type"));
  }

  @Test public void n_a2_nullAndEmptyInputsYieldAnEmptyMap() {
    Map<String, String> fromNull = MetaAppEventParameters.strings(null);
    assertNotNull(fromNull);
    assertTrue(fromNull.isEmpty());

    Map<String, String> fromEmpty = MetaAppEventParameters.strings(new JavaOnlyMap());
    assertNotNull(fromEmpty);
    assertTrue(fromEmpty.isEmpty());
  }
}
