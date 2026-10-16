package com.libitum.host;

import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableMapKeySetIterator;
import com.lynx.react.bridge.ReadableType;
import java.util.HashMap;
import java.util.Map;

/** JS가 보낸 시맨틱 속성 맵에서 문자열 값만 고른다. 그 밖의 타입은 버린다. */
final class AirbridgeEventAttributes {
  private AirbridgeEventAttributes() {}

  static Map<String, String> strings(ReadableMap attributes) {
    Map<String, String> result = new HashMap<>();
    if (attributes == null) return result;
    ReadableMapKeySetIterator keys = attributes.keySetIterator();
    while (keys.hasNextKey()) {
      String key = keys.nextKey();
      if (attributes.getType(key) == ReadableType.String) {
        String value = attributes.getString(key);
        if (value != null) result.put(key, value);
      }
    }
    return result;
  }
}
