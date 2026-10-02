package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.Test;

public final class PushTokenCodecTest {
  @Test public void encodesOpaqueTokenForTheSharedRpc() {
    String raw = "bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1";
    String stored = PushTokenCodec.stored(raw);
    assertEquals("fcm." + Base64.getUrlEncoder().withoutPadding().encodeToString(
        raw.getBytes(StandardCharsets.UTF_8)), stored);
  }

  @Test public void rejectsMissingAndOversizedTokens() {
    assertNull(PushTokenCodec.stored(null));
    assertNull(PushTokenCodec.stored("short"));
    assertNull(PushTokenCodec.stored("x".repeat(3073)));
    assertNull(PushTokenCodec.stored("a".repeat(19) + "\n"));
  }
}
