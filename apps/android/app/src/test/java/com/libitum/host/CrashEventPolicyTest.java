package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import io.sentry.Breadcrumb;
import io.sentry.SentryEvent;
import io.sentry.SentryLevel;
import io.sentry.protocol.Device;
import io.sentry.protocol.Message;
import io.sentry.protocol.Request;
import io.sentry.protocol.SentryException;
import io.sentry.protocol.User;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.Test;

public final class CrashEventPolicyTest {
  private static final String JWT =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  private static SentryEvent javaCrashEvent(String value) {
    SentryException ex = new SentryException();
    ex.setType("IllegalStateException");
    ex.setValue(value);
    SentryEvent event = new SentryEvent();
    event.setExceptions(new ArrayList<>(Arrays.asList(ex)));
    return event;
  }

  @Test public void e1_eventFromHasTheClosedShape() {
    CrashReportPayload p =
        CrashReportPayload.fromLynxError(
            201, "error", "TypeError: x is undefined\n    at a (f:1:2)\n    at b (f:3:4)");
    assertNotNull(p);
    SentryEvent event = CrashEventPolicy.eventFrom(p);
    assertEquals(SentryLevel.ERROR, event.getLevel());
    List<SentryException> exceptions = event.getExceptions();
    assertNotNull(exceptions);
    assertEquals(1, exceptions.size());
    SentryException ex = exceptions.get(0);
    assertEquals(p.name, ex.getType());
    assertEquals(p.message, ex.getValue());
    assertNotNull(ex.getMechanism());
    assertEquals("lynx", ex.getMechanism().getType());
    assertEquals(Boolean.TRUE, ex.getMechanism().isHandled());
    assertEquals(p.source.tag, event.getTag("lynx.source"));
    assertEquals(p.fingerprint(), event.getFingerprints());
    assertEquals(4, event.getFingerprints().size());
    Object lynx = event.getContexts().get("lynx");
    assertTrue("contexts.lynx must be a map", lynx instanceof Map);
    assertEquals(
        String.join("\n", p.stackLines), String.valueOf(((Map<?, ?>) lynx).get("stack")));
    assertNull(event.getUser());
  }

  @Test public void e2_beforeSendClearsIdentifyingFields() {
    SentryEvent event = javaCrashEvent("boom");
    User user = new User();
    user.setId("install-id");
    user.setEmail("a@b.co");
    user.setIpAddress("1.2.3.4");
    event.setUser(user);
    event.setBreadcrumbs(new ArrayList<>(Arrays.asList(new Breadcrumb("one"), new Breadcrumb("two"))));
    event.setServerName("host-name");
    event.setRequest(new Request());
    Device device = new Device();
    device.setName("Kim's Pixel");
    event.getContexts().setDevice(device);

    SentryEvent result = CrashEventPolicy.beforeSend(event);

    assertSame(event, result);
    assertNull(result.getUser());
    assertTrue(result.getBreadcrumbs() == null || result.getBreadcrumbs().isEmpty());
    assertNull(result.getServerName());
    assertNull(result.getRequest());
    Device after = result.getContexts().getDevice();
    assertTrue(after == null || after.getName() == null);
  }

  @Test public void e3_beforeSendScrubsExceptionValueOfJavaCrash() {
    SentryEvent event = javaCrashEvent("failed for a@b.co token " + JWT);
    SentryEvent result = CrashEventPolicy.beforeSend(event);
    assertNotNull(result);
    String value = result.getExceptions().get(0).getValue();
    assertEquals("failed for [email] token [token]", value);
  }

  @Test public void e3_beforeSendTruncatesLongExceptionValue() {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < 200; i++) sb.append("ab ");
    SentryEvent result = CrashEventPolicy.beforeSend(javaCrashEvent(sb.toString()));
    assertNotNull(result);
    int length = result.getExceptions().get(0).getValue().length();
    assertTrue(length <= 300);
    assertTrue(length > 250);
  }

  @Test public void e3_beforeSendScrubsMessageBody() {
    SentryEvent event = javaCrashEvent("x");
    Message message = new Message();
    message.setMessage("call 010-1234-5678 mail a@b.co");
    event.setMessage(message);
    SentryEvent result = CrashEventPolicy.beforeSend(event);
    assertNotNull(result);
    assertEquals("call [number] mail [email]", result.getMessage().getMessage());
  }

  @Test public void e4_beforeSendDropsTheEventWhenItCannotCleanIt() {
    SentryEvent event = new SentryEvent();
    List<SentryException> broken = new ArrayList<>();
    broken.add(null);
    event.setExceptions(broken);
    assertNull(CrashEventPolicy.beforeSend(event));
  }

  @Test public void e4_beforeSendKeepsACleanEvent() {
    assertFalse(CrashEventPolicy.beforeSend(javaCrashEvent("boom")) == null);
  }
}
