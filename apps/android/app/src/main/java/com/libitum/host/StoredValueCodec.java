package com.libitum.host;

/**
 * Wraps every value {@link StorageModule} writes between two U+E000 marks and strips them on
 * read. SharedPreferences stores values as XML text, and its writer indents the closing tag after a
 * value that ends in a newline; after a restart those spaces come back as part of the value. Every
 * episode body ends in "\n", so it gained four spaces, failed its SHA-256 check and was dropped on
 * each launch. A private-use mark keeps the value from ending in whitespace and never appears in
 * content. Values written before this codec have no marks and are read as they are. Pure for JUnit.
 */
final class StoredValueCodec {
  private static final char MARK = '';

  private StoredValueCodec() {}

  static String encode(String value) {
    if (value == null) return null;
    return MARK + value + MARK;
  }

  static String decode(String stored) {
    if (stored == null) return null;
    int last = stored.length() - 1;
    if (last >= 1 && stored.charAt(0) == MARK && stored.charAt(last) == MARK) {
      return stored.substring(1, last);
    }
    return stored;
  }
}
