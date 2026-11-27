package com.libitum.host;

import io.sentry.SentryEvent;
import io.sentry.SentryLevel;
import io.sentry.protocol.DebugImage;
import io.sentry.protocol.DebugMeta;
import io.sentry.protocol.Device;
import io.sentry.protocol.Mechanism;
import io.sentry.protocol.Message;
import io.sentry.protocol.SentryException;
import io.sentry.protocol.SentryStackFrame;
import io.sentry.protocol.SentryStackTrace;
import io.sentry.protocol.SentryThread;
import io.sentry.protocol.User;
import java.util.Collections;
import java.util.List;

/** Builds and sanitizes Sentry events. Every event that leaves the app passes beforeSend. */
public final class CrashEventPolicy {
  private CrashEventPolicy() {}

  public static SentryEvent eventFrom(CrashReportPayload p) {
    Mechanism mechanism = new Mechanism();
    mechanism.setType("lynx");
    // The app did not die, so the session must not count as crashed.
    mechanism.setHandled(true);
    SentryException exception = new SentryException();
    exception.setType(p.name);
    exception.setValue(p.message);
    exception.setMechanism(mechanism);
    SentryEvent event = new SentryEvent();
    event.setLevel(SentryLevel.ERROR);
    event.setExceptions(Collections.singletonList(exception));
    event.setTag("lynx.source", p.source.tag);
    event.setFingerprints(p.fingerprint());
    event.getContexts().put("lynx", Collections.singletonMap("stack", String.join("\n", p.stackLines)));
    return event;
  }

  /** beforeSend with the signed-in user the host holds right now (CrashUser). */
  public static SentryEvent beforeSend(SentryEvent e) {
    return beforeSend(e, CrashUser.current());
  }

  /**
   * The same event with identifying fields cleared, or null when it cannot be cleaned. The user is
   * rebuilt from the internal id alone (docs/adr/0207); without a valid id there is no user.
   */
  public static SentryEvent beforeSend(SentryEvent e, String userId) {
    try {
      e.setUser(userOf(userId));
      e.setBreadcrumbs(null);
      e.setServerName(null);
      e.setRequest(null);
      Device device = e.getContexts().getDevice();
      if (device != null) {
        device.setName(null);
        device.setId(null);
        device.setBootTime(null);
      }
      List<SentryException> exceptions = e.getExceptions();
      if (exceptions != null) {
        for (SentryException exception : exceptions) {
          String value = exception.getValue();
          if (value != null) exception.setValue(clean(value));
          clearInstallPath(exception.getStacktrace());
        }
      }
      List<SentryThread> threads = e.getThreads();
      if (threads != null) {
        for (SentryThread thread : threads) clearInstallPath(thread.getStacktrace());
      }
      DebugMeta meta = e.getDebugMeta();
      if (meta != null && meta.getImages() != null) {
        for (DebugImage image : meta.getImages()) {
          image.setCodeFile(withoutInstallPath(image.getCodeFile()));
          image.setDebugFile(withoutInstallPath(image.getDebugFile()));
        }
      }
      Message message = e.getMessage();
      if (message != null) {
        if (message.getMessage() != null) message.setMessage(clean(message.getMessage()));
        if (message.getFormatted() != null) message.setFormatted(clean(message.getFormatted()));
        message.setParams(null);
      }
      return e;
    } catch (RuntimeException | StackOverflowError error) {
      return null;
    }
  }

  private static User userOf(String userId) {
    String id = CrashUser.idFrom(userId);
    if (id == null) return null;
    User user = new User();
    user.setId(id);
    return user;
  }

  static String withoutInstallPath(String value) {
    return CrashScrub.withoutInstallPath(value);
  }

  private static void clearInstallPath(SentryStackTrace trace) {
    if (trace == null || trace.getFrames() == null) return;
    for (SentryStackFrame frame : trace.getFrames()) {
      frame.setPackage(withoutInstallPath(frame.getPackage()));
      frame.setFilename(withoutInstallPath(frame.getFilename()));
      frame.setAbsPath(withoutInstallPath(frame.getAbsPath()));
      frame.setModule(withoutInstallPath(frame.getModule()));
    }
  }

  private static String clean(String value) {
    String scrubbed = CrashScrub.scrub(CrashReportPayload.preCapMessage(value));
    int max = CrashReportPayload.MESSAGE_MAX;
    return scrubbed.length() > max ? scrubbed.substring(0, max) : scrubbed;
  }
}
