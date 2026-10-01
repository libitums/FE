package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class WebAuthenticationModuleTest {
  @Test public void randomBytesAreSynchronousHexAndDistinct() {
    WebAuthenticationModule module = new WebAuthenticationModule(
        InstrumentationRegistry.getInstrumentation().getTargetContext(), null);
    String first = module.randomBytes(32);
    String second = module.randomBytes(32);
    assertTrue(first.matches("[0-9a-f]{64}"));
    assertTrue(second.matches("[0-9a-f]{64}"));
    assertTrue(!first.equals(second));
    assertEquals("", module.randomBytes(0));
    assertEquals("", module.randomBytes(65));
  }

  @Test public void invalidRequestCallsBackWithoutOpeningBrowser() {
    WebAuthenticationModule module = new WebAuthenticationModule(
        InstrumentationRegistry.getInstrumentation().getTargetContext(), null);
    JavaOnlyMap args = new JavaOnlyMap();
    args.putString("url", "http://example.test/authorize");
    args.putString("callbackScheme", "duru");
    AtomicReference<Object> received = new AtomicReference<>();
    module.start(args, values -> received.set(values[0]));
    assertTrue(received.get() instanceof JavaOnlyMap);
    assertEquals("invalid-arguments", ((JavaOnlyMap) received.get()).getString("status"));
  }
}
