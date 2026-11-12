package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/** iOS {@code ExternalLinkModuleTests}(EL1 · EL2)와 같은 표. 실제로 여는 것은 수동 e2e가 본다. */
public final class ExternalLinkPolicyTest {
  @Test public void el1AllowsTelAndHttps() {
    assertEquals("tel:988", ExternalLinkPolicy.target("tel:988"));
    assertEquals("tel:+63288044673", ExternalLinkPolicy.target("tel:+63 2 8804 4673"));
    assertEquals("tel:1-800-273-8255", ExternalLinkPolicy.target("tel:1-800-273-8255"));
    assertEquals("https://findahelpline.com/ph", ExternalLinkPolicy.target("https://findahelpline.com/ph"));
  }

  @Test public void el2RejectsOthers() {
    String[] urls = {
      "http://example.org", "javascript:alert(1)", "tel:", "tel:abc", "https://", "sms:988", "",
      "file:///etc/passwd", "https://a b.example", "https://x.example\n", "tel:988\n",
      "https://a\u00A0b.example", null,
    };
    for (String url : urls) assertNull(url, ExternalLinkPolicy.target(url));
  }
}
