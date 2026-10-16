package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import io.sentry.SentryEvent;
import io.sentry.protocol.Message;
import io.sentry.protocol.SentryException;
import java.util.Collections;
import org.junit.Test;

/** Review round four, W11: the install path also rides in exception and message text. */
public final class CrashInstallPathMessageTest {
  private static final String DIR = "/data/app/~~Xq3Z_ab-9w==/libitum.duru.android-Kp4L_qQ2mP0Lw==/";
  private static final String LINK = "dlopen failed: library \"" + DIR + "lib/arm64/liblynx.so\" not found";
  private static final String DEX =
      "DexPathList[[zip file \"" + DIR + "base.apk\"],nativeLibraryDirectories=[" + DIR + "lib/arm64]]";

  private static void noRandomPiece(String out) {
    assertFalse(out, out.contains("Xq3Z_ab"));
    assertFalse(out, out.contains("Kp4L_qQ2mP0Lw"));
  }

  @Test public void rw11_exceptionValueLosesTheInstallPath() {
    for (String text : new String[] {LINK, DEX}) {
      SentryEvent event = new SentryEvent();
      SentryException exception = new SentryException();
      exception.setType("UnsatisfiedLinkError");
      exception.setValue(text);
      event.setExceptions(Collections.singletonList(exception));
      SentryEvent result = CrashEventPolicy.beforeSend(event);
      assertNotNull(result);
      String out = result.getExceptions().get(0).getValue();
      noRandomPiece(out);
      assertTrue(out, out.contains("/data/app/[install]/"));
    }
  }

  @Test public void rw11_messageBodyLosesTheInstallPath() {
    SentryEvent event = new SentryEvent();
    Message message = new Message();
    message.setMessage(LINK);
    message.setFormatted(LINK);
    event.setMessage(message);
    SentryEvent result = CrashEventPolicy.beforeSend(event);
    assertNotNull(result);
    noRandomPiece(result.getMessage().getMessage());
    noRandomPiece(result.getMessage().getFormatted());
  }

  @Test public void rw11_jsPayloadLosesTheInstallPathToo() {
    CrashReportPayload p = CrashReportPayload.fromLynxError(201, "error", "Error: " + LINK + "\n    at f (" + DIR + "x.js:1:2)");
    assertNotNull(p);
    noRandomPiece(p.message);
    noRandomPiece(p.stackLines.get(0));
  }
}
