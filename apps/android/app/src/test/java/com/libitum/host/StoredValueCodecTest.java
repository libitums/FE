package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public final class StoredValueCodecTest {
  @Test public void encodedValuesNeverEndWithWhitespace() {
    // SharedPreferences' XML writer indents the closing tag after a value that ends in "\n", and
    // the indent comes back as part of the value after a restart (episode bodies gained "    ").
    for (String value : new String[] {"{\n}\n", "a\n", "\n", " ", "x\t", "", "plain"}) {
      String encoded = StoredValueCodec.encode(value);
      assertFalse(encoded.isEmpty());
      assertFalse(Character.isWhitespace(encoded.charAt(encoded.length() - 1)));
    }
  }

  @Test public void decodeRestoresTheExactValue() {
    for (String value : new String[] {"{\n  \"a\": 1\n}\n", "a\n", "\n", "", "plain", "한글\n", ""}) {
      assertEquals(value, StoredValueCodec.decode(StoredValueCodec.encode(value)));
    }
  }

  @Test public void valuesWrittenBeforeTheCodecAreReadAsIs() {
    assertEquals("plain", StoredValueCodec.decode("plain"));
    assertEquals("", StoredValueCodec.decode(""));
    // An old body already damaged on disk stays damaged; its SHA-256 check fails and the app
    // fetches it again, and that write goes through the codec.
    assertEquals("{\n}\n    ", StoredValueCodec.decode("{\n}\n    "));
    assertEquals("", StoredValueCodec.decode(""));
  }

  @Test public void nullStaysNull() {
    assertNull(StoredValueCodec.encode(null));
    assertNull(StoredValueCodec.decode(null));
  }
}
