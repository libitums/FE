package com.libitum.host;

public final class WebAuthContractTest {
  private static void check(boolean actual, boolean expected, String scenario) {
    if (actual != expected) throw new AssertionError(scenario);
  }

  public static void main(String[] args) {
    check(WebAuthContract.validRequest("https://example.supabase.co/auth/v1/authorize?provider=apple", "duru"), true, "valid authorize URL");
    check(WebAuthContract.validRequest("http://example.supabase.co/auth/v1/authorize", "duru"), false, "HTTP rejected");
    check(WebAuthContract.validRequest("https://user@example.supabase.co/", "duru"), false, "credentials rejected");
    check(WebAuthContract.validRequest("https://example.supabase.co/", "other"), false, "unregistered scheme rejected");
    check(WebAuthContract.validRequest("not a URL", "duru"), false, "malformed URL rejected");

    check(WebAuthContract.expectedRedirect("duru://auth-callback?code=abc", "duru"), true, "query redirect");
    check(WebAuthContract.expectedRedirect("duru://auth-callback#error=cancelled", "duru"), true, "fragment redirect");
    check(WebAuthContract.expectedRedirect("duru://another-host?code=abc", "duru"), false, "wrong host rejected");
    check(WebAuthContract.expectedRedirect("duru://auth-callback/other?code=abc", "duru"), false, "wrong path rejected");
    check(WebAuthContract.expectedRedirect("duru://auth-callback:123?code=abc", "duru"), false, "port rejected");
    check(WebAuthContract.expectedRedirect("other://auth-callback?code=abc", "duru"), false, "wrong scheme rejected");
  }
}
