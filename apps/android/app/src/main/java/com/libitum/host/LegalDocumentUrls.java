package com.libitum.host;

/** The only destinations exposed to Lynx; keep them aligned with the iOS host's URL table. */
final class LegalDocumentUrls {
  private static final String PRIVACY_POLICY =
      "https://gregarious-pharaoh-bb6.notion.site/DURU-Privacy-Policy-3eb0c2540c01802cad91cc0430552402";
  private static final String TERMS_OF_USE =
      "https://gregarious-pharaoh-bb6.notion.site/DURU-Term-of-Use-3eb0c2540c0180ef9072f0b447b3b468";

  private LegalDocumentUrls() {}

  static String forName(String document) {
    if ("privacy-policy".equals(document)) return PRIVACY_POLICY;
    if ("terms-of-use".equals(document)) return TERMS_OF_USE;
    return null;
  }
}
