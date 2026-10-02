package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableMap;
import java.security.SecureRandom;

/** Lynx bridge for the OAuth browser session and synchronous PKCE randomness. */
public final class WebAuthenticationModule extends LynxModule {
  private static final char[] HEX = "0123456789abcdef".toCharArray();
  private final MainActivity activity;
  private final SecureRandom random = new SecureRandom();

  public WebAuthenticationModule(Context context, Object param) {
    super(context, param);
    activity = param instanceof MainActivity ? (MainActivity) param : null;
  }

  @LynxMethod public String randomBytes(int count) {
    if (count < 1 || count > 64) return "";
    try {
      byte[] bytes = new byte[count];
      random.nextBytes(bytes);
      char[] hex = new char[count * 2];
      for (int index = 0; index < count; index++) {
        hex[index * 2] = HEX[(bytes[index] & 0xff) >>> 4];
        hex[index * 2 + 1] = HEX[bytes[index] & 0x0f];
      }
      return new String(hex);
    } catch (RuntimeException error) {
      return "";
    }
  }

  @LynxMethod public void start(ReadableMap args, Callback callback) {
    String url = null;
    String scheme = null;
    try {
      if (args != null) {
        url = args.getString("url");
        scheme = args.getString("callbackScheme");
      }
    } catch (RuntimeException ignored) {
      // Invalid bridge values get the same result as missing arguments.
    }
    if (!WebAuthContract.validRequest(url, scheme)) {
      callback.invoke(payload("invalid-arguments", null));
      return;
    }
    if (activity == null) {
      callback.invoke(payload("failed", null));
      return;
    }
    String authorizeUrl = url;
    String callbackScheme = scheme;
    activity.runOnUiThread(() -> activity.startWebAuthentication(authorizeUrl, callbackScheme, callback));
  }

  static JavaOnlyMap payload(String status, String callbackUrl) {
    JavaOnlyMap result = new JavaOnlyMap();
    result.putString("status", status);
    if (callbackUrl != null) result.putString("callbackUrl", callbackUrl);
    return result;
  }
}
