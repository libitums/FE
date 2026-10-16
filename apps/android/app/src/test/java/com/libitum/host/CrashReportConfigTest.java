package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public final class CrashReportConfigTest {
  @Test public void c1_dsnFromAcceptsWellFormedDsn() {
    String dsn = "https://abc123@o1.ingest.us.sentry.io/456";
    assertEquals(dsn, CrashReportConfig.dsnFrom(dsn));
  }

  @Test public void c1_dsnFromTrimsSurroundingWhitespace() {
    String dsn = "https://abc123@o1.ingest.us.sentry.io/456";
    assertEquals(dsn, CrashReportConfig.dsnFrom("  " + dsn + " \n"));
  }

  @Test public void c1_dsnFromRejectsEverythingElse() {
    String[] rejected = {
      null,
      "",
      "   ",
      "http://abc123@o1.ingest.us.sentry.io/456",
      "https://k:s@host/1",
      "https://k@host/",
      "https://k@host/1/x",
      "https://host/1",
    };
    for (String raw : rejected) {
      assertNull("dsn must be rejected: " + raw, CrashReportConfig.dsnFrom(raw));
    }
  }

  @Test public void c2_releaseOfJoinsIdVersionAndCode() {
    assertEquals(
        "libitum.duru.android@0.1.0+2",
        CrashReportConfig.releaseOf("libitum.duru.android", "0.1.0", 2));
  }

  @Test public void c3_proguardUuidFromLowercasesAValidUuid() {
    assertEquals(
        "123e4567-e89b-12d3-a456-426614174000",
        CrashReportConfig.proguardUuidFrom("123E4567-E89B-12D3-A456-426614174000"));
  }

  @Test public void c3_proguardUuidFromRejectsNonUuid() {
    assertNull(CrashReportConfig.proguardUuidFrom(null));
    assertNull(CrashReportConfig.proguardUuidFrom(""));
    assertNull(CrashReportConfig.proguardUuidFrom("abc"));
  }
}
