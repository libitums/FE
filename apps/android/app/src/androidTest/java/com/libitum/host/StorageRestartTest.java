package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Run the methods in separate instrumentation processes with test-storage-restart.sh. */
@RunWith(AndroidJUnit4.class)
public final class StorageRestartTest {
  private static final String KEY = "libitum.auth.session";
  private static final String SESSION =
      "{\"accessToken\":\"a3-test-access\",\"refreshToken\":\"a3-test-refresh\",\"expiresAt\":1}";

  private StorageModule module() {
    return new StorageModule(InstrumentationRegistry.getInstrumentation().getTargetContext());
  }

  @Test public void writeSession() {
    StorageModule storage = module();
    storage.remove(KEY);
    assertNull(storage.get(KEY));
    storage.set(KEY, SESSION);
    assertEquals(SESSION, storage.get(KEY));
  }

  @Test public void readAndRemoveSession() {
    StorageModule storage = module();
    assertEquals(SESSION, storage.get(KEY));
    storage.remove(KEY);
    assertNull(storage.get(KEY));
  }

  @Test public void removedSessionStaysRemoved() {
    assertNull(module().get(KEY));
  }
}
