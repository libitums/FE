package com.libitum.host;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public final class CrashScrubTest {
  private static String repeat(char c, int n) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) sb.append(c);
    return sb.toString();
  }

  private static final String JWT =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  // Reference vectors V1..V15: {input, expected}.
  private static String[][] vectors() {
    return new String[][] {
      {"Cannot read properties of undefined (reading 'title')",
       "Cannot read properties of undefined (reading 'title')"},
      {"login failed for kim.sehyun+test@example.co.kr", "login failed for [email]"},
      {"otp sent to 010-1234-5678", "otp sent to [number]"},
      {"otp sent to +82 10 1234 5678", "otp sent to [number]"},
      {"call (02) 123-4567 now", "call ([number] now"},
      {"401 with Bearer abc.def-123", "401 with Bearer [token]"},
      {"token " + JWT + " expired", "token [token] expired"},
      {"refresh v1_0123456789abcdef0123456789abcdef rejected", "refresh [token] rejected"},
      {"GET https://abc.supabase.co/auth/v1/verify?token=123456&type=sms failed",
       "GET https://abc.supabase.co/auth/v1/verify?[redacted] failed"},
      {"open duru://auth-callback#access_token=xyz", "open duru://auth-callback?[redacted]"},
      {"answer was 안녕하세요 반갑습니다",
       "answer was [text] [text]"},
      {"    at render (file:///data/app/main.lynx.bundle:1:1234567)",
       "    at render (file:///data/app/main.lynx.bundle:1:1234567)"},
      {"user 7f3c2a10-9b1e-4c55-8a2f-0d1e2f3a4b5c not found", "user [token] not found"},
      {"status 404 at step 12 of 30", "status 404 at step 12 of 30"},
      {repeat('x', 31) + " " + repeat('y', 32), repeat('x', 31) + " [token]"},
    };
  }

  @Test public void s1_referenceVectorsV1toV15() {
    String[][] vs = vectors();
    assertEquals(15, vs.length);
    for (int i = 0; i < vs.length; i++) {
      assertEquals("V" + (i + 1), vs[i][1], CrashScrub.scrub(vs[i][0]));
    }
  }

  @Test public void s2_nullAndEmptyBecomeEmpty() {
    assertEquals("", CrashScrub.scrub(null));
    assertEquals("", CrashScrub.scrub(""));
  }

  @Test public void s2_emailPhoneAndJwtInOneStringAreAllReplaced() {
    String out = CrashScrub.scrub("a@b.co called 010-1234-5678 with " + JWT);
    assertEquals("[email] called [number] with [token]", out);
  }

  @Test public void s3_scrubbingIsIdempotentForV2toV13() {
    String[][] vs = vectors();
    for (int i = 1; i <= 12; i++) {
      String once = CrashScrub.scrub(vs[i][0]);
      assertEquals("V" + (i + 1), once, CrashScrub.scrub(once));
    }
  }
}
