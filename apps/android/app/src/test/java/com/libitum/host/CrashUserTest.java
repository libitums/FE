package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import io.sentry.SentryEvent;
import io.sentry.protocol.Device;
import io.sentry.protocol.User;
import java.util.Collections;
import org.junit.After;
import org.junit.Test;

/** The crash user is the internal id only; logout and account deletion clear it (docs/adr/0207). */
public final class CrashUserTest {
  private static final String ID = "3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f";

  @After public void reset() {
    CrashUser.clear();
  }

  @Test public void u1_onlyTheUuidShapeIsAnId() {
    assertEquals(ID, CrashUser.idFrom(ID));
    assertEquals(ID, CrashUser.idFrom(" " + ID.toUpperCase() + " "));
    assertNull(CrashUser.idFrom("u1"));
    assertNull(CrashUser.idFrom("kim@example.com"));
    assertNull(CrashUser.idFrom(""));
    assertNull(CrashUser.idFrom(null));
    assertNull(CrashUser.idFrom(ID + "x"));
  }

  @Test public void u2_setKeepsAValidIdAndClearForgetsIt() {
    assertTrue(CrashUser.set(ID));
    assertEquals(ID, CrashUser.current());
    CrashUser.clear();
    assertNull(CrashUser.current());
  }

  @Test public void u3_anInvalidIdClearsThePreviousOne() {
    assertTrue(CrashUser.set(ID));
    assertFalse(CrashUser.set("kim@example.com"));
    assertNull(CrashUser.current());
  }

  @Test public void u4_beforeSendKeepsOnlyTheIdOnTheUser() {
    SentryEvent event = new SentryEvent();
    User incoming = new User();
    incoming.setId("installation-id");
    incoming.setEmail("kim@example.com");
    incoming.setUsername("kim");
    incoming.setIpAddress("{{auto}}");
    incoming.setData(Collections.singletonMap("name", "Kim"));
    event.setUser(incoming);
    Device device = new Device();
    device.setId("device-id");
    event.getContexts().setDevice(device);

    SentryEvent out = CrashEventPolicy.beforeSend(event, ID);

    assertNotNull(out);
    User user = out.getUser();
    assertNotNull(user);
    assertEquals(ID, user.getId());
    assertNull(user.getEmail());
    assertNull(user.getUsername());
    assertNull(user.getIpAddress());
    assertNull(user.getData());
    assertNull(user.getName());
    assertNull(out.getContexts().getDevice().getId());
  }

  @Test public void u5_withoutAnIdTheEventHasNoUser() {
    SentryEvent event = new SentryEvent();
    User incoming = new User();
    incoming.setId("installation-id");
    event.setUser(incoming);

    assertNull(CrashEventPolicy.beforeSend(event, null).getUser());
  }

  @Test public void u6_beforeSendRejectsAnIdThatIsNotTheUuidShape() {
    SentryEvent event = new SentryEvent();

    assertNull(CrashEventPolicy.beforeSend(event, "kim@example.com").getUser());
  }
}
