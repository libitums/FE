package com.libitum.host;

import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableMapKeySetIterator;
import com.lynx.react.bridge.ReadableType;
import java.util.HashMap;
import java.util.Map;

/** JS가 보낸 파라미터 맵에서 문자열 값만 고른다. 그 밖의 타입은 버린다. */
final class MetaAppEventParameters {
  private MetaAppEventParameters() {}

  static Map<String, String> strings(ReadableMap parameters) {
    Map<String, String> result = new HashMap<>();
    if (parameters == null) return result;
    ReadableMapKeySetIterator keys = parameters.keySetIterator();
    while (keys.hasNextKey()) {
      String key = keys.nextKey();
      if (parameters.getType(key) == ReadableType.String) {
        String value = parameters.getString(key);
        if (value != null) result.put(key, value);
      }
    }
    return result;
  }
}
