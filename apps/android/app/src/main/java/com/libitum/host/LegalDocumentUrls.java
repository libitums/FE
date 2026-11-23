package com.libitum.host;

/**
 * The only destinations exposed to Lynx; keep them aligned with the iOS host's URL table.
 * Since 2026-11-20 they are the English base pages on our landing domain (ADR-0167).
 */
final class LegalDocumentUrls {
  private static final String PRIVACY_POLICY = "https://k-duru.com/privacy/";
  private static final String TERMS_OF_USE = "https://k-duru.com/terms/";

  private LegalDocumentUrls() {}

  static String forName(String document) {
    if ("privacy-policy".equals(document)) return PRIVACY_POLICY;
    if ("terms-of-use".equals(document)) return TERMS_OF_USE;
    return null;
  }
}
