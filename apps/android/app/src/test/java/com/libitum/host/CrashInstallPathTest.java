package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import io.sentry.SentryEvent;
import io.sentry.protocol.DebugImage;
import io.sentry.protocol.DebugMeta;
import io.sentry.protocol.SentryException;
import io.sentry.protocol.SentryStackFrame;
import io.sentry.protocol.SentryStackTrace;
import io.sentry.protocol.SentryThread;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.Test;

/**
 * The random install directory is fixed for one install, so it can tie every native crash to one
 * device (docs/e2e/crash-reporting.md, tombstone run on API 34). It must not leave the app.
 */
public final class CrashInstallPathTest {
  private static final String INSTALLED =
      "/data/app/~~Zq3x_Abc-9w==/libitum.duru.android-Yt7_kQ2mP0Lw==/lib/arm64/liblynx.so";
  private static final String NORMALIZED = "/data/app/[install]/lib/arm64/liblynx.so";

  private static SentryStackFrame frame() {
    SentryStackFrame f = new SentryStackFrame();
    f.setPackage(INSTALLED);
    f.setFilename(INSTALLED);
    f.setAbsPath(INSTALLED);
    f.setModule(INSTALLED);
    return f;
  }

  private static SentryStackTrace trace() {
    List<SentryStackFrame> frames = new ArrayList<>();
    frames.add(frame());
    return new SentryStackTrace(frames);
  }

  private static void assertFrame(SentryStackFrame f) {
    assertEquals(NORMALIZED, f.getPackage());
    assertEquals(NORMALIZED, f.getFilename());
    assertEquals(NORMALIZED, f.getAbsPath());
    assertEquals(NORMALIZED, f.getModule());
  }

  @Test public void ri1_installPathIsNormalizedEverywhereItAppears() {
    SentryEvent event = new SentryEvent();
    SentryException exception = new SentryException();
    exception.setType("SIGSEGV");
    exception.setValue("Segfault");
    exception.setStacktrace(trace());
    event.setExceptions(Collections.singletonList(exception));
    SentryThread thread = new SentryThread();
    thread.setStacktrace(trace());
    event.setThreads(Collections.singletonList(thread));
    DebugImage image = new DebugImage();
    image.setCodeFile(INSTALLED);
    image.setDebugFile(INSTALLED);
    DebugMeta meta = new DebugMeta();
    meta.setImages(new ArrayList<>(Collections.singletonList(image)));
    event.setDebugMeta(meta);

    SentryEvent result = CrashEventPolicy.beforeSend(event);
    assertNotNull(result);
    assertFrame(result.getExceptions().get(0).getStacktrace().getFrames().get(0));
    assertFrame(result.getThreads().get(0).getStacktrace().getFrames().get(0));
    assertEquals(NORMALIZED, result.getDebugMeta().getImages().get(0).getCodeFile());
    assertEquals(NORMALIZED, result.getDebugMeta().getImages().get(0).getDebugFile());
  }

  @Test public void ri1_pathWithoutTheTildePrefixIsNormalizedToo() {
    assertEquals("/data/app/[install]/base.apk",
        CrashEventPolicy.withoutInstallPath("/data/app/libitum.duru.android-Yt7_kQ2mP0Lw==/base.apk"));
  }

  @Test public void ri1_systemPathsAndPlainFramesStay() {
    for (String path : new String[] {
        "/apex/com.android.runtime/lib64/bionic/libc.so", "/system/lib64/libutils.so",
        "    at f (/.rspeedy/main/background.js:7:310)"}) {
      assertEquals(path, CrashEventPolicy.withoutInstallPath(path));
    }
  }
}
