package com.libitum.host;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** Android's opaque FCM token as the shared RPC's URL-safe stored token. */
final class PushTokenCodec {
  private PushTokenCodec() {}

  static String stored(String raw) {
    if (raw == null) return null;
    byte[] bytes = raw.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 20 || bytes.length > 3072) return null;
    for (int index = 0; index < raw.length(); index++) {
      char value = raw.charAt(index);
      if (value < 32 || value == 127) return null;
    }
    return "fcm." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
