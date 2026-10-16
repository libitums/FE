package com.libitum.host;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** RV5: the three scrub rules added by the review correction (vectors V16..V19). */
public final class CrashScrubCorrectionTest {
  private static final String[][] VECTORS = {
    {"GET /auth/v1/verify?token=123456&type=sms failed", "GET /auth/v1/verify?[redacted] failed"},
    {"Authorization: Basic dXNlcjpwYXNz", "Authorization: Basic [token]"},
    {"kim@localhost failed", "[email] failed"},
    {"path /users/a?email=a%40b.co", "path /users/a?[redacted]"},
  };

  @Test public void rv5_v16_schemelessQueryIsRedacted() {
    assertEquals("V16", VECTORS[0][1], CrashScrub.scrub(VECTORS[0][0]));
  }

  @Test public void rv5_v17_basicAuthHeadIsRedacted() {
    assertEquals("V17", VECTORS[1][1], CrashScrub.scrub(VECTORS[1][0]));
  }

  @Test public void rv5_v18_dotlessEmailIsRedacted() {
    assertEquals("V18", VECTORS[2][1], CrashScrub.scrub(VECTORS[2][0]));
  }

  @Test public void rv5_v19_encodedQueryValueIsRedacted() {
    assertEquals("V19", VECTORS[3][1], CrashScrub.scrub(VECTORS[3][0]));
  }

  @Test public void rv5_scrubbingIsIdempotentForV16toV19() {
    for (int i = 0; i < VECTORS.length; i++) {
      String once = CrashScrub.scrub(VECTORS[i][0]);
      assertEquals("V" + (i + 16), once, CrashScrub.scrub(once));
    }
  }
}
