package com.libitum.host;

import com.lynx.react.bridge.ReadableArray;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableMapKeySetIterator;
import com.lynx.react.bridge.ReadableType;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * JS가 보낸 시맨틱 속성 맵에서 문자열 · 수 · 상품 줄 배열(Order Complete, 2026-11-19)만 고른다. 상품 줄 안도 문자열 · 수만.
 * 그 밖의 타입(불리언 · 중첩 맵 · null)은 버린다.
 */
final class AirbridgeEventAttributes {
  private AirbridgeEventAttributes() {}

  static Map<String, Object> semantic(ReadableMap attributes) {
    Map<String, Object> result = new HashMap<>();
    if (attributes == null) return result;
    ReadableMapKeySetIterator keys = attributes.keySetIterator();
    while (keys.hasNextKey()) {
      String key = keys.nextKey();
      if (attributes.getType(key) == ReadableType.Array) {
        result.put(key, rows(attributes.getArray(key)));
        continue;
      }
      Object value = scalar(attributes, key);
      if (value != null) result.put(key, value);
    }
    return result;
  }

  private static List<Map<String, Object>> rows(ReadableArray array) {
    List<Map<String, Object>> rows = new ArrayList<>();
    if (array == null) return rows;
    for (int index = 0; index < array.size(); index++) {
      if (array.getType(index) != ReadableType.Map) continue;
      ReadableMap row = array.getMap(index);
      if (row == null) continue;
      Map<String, Object> kept = new HashMap<>();
      ReadableMapKeySetIterator keys = row.keySetIterator();
      while (keys.hasNextKey()) {
        String key = keys.nextKey();
        Object value = scalar(row, key);
        if (value != null) kept.put(key, value);
      }
      rows.add(kept);
    }
    return rows;
  }

  private static Object scalar(ReadableMap map, String key) {
    ReadableType type = map.getType(key);
    if (type == ReadableType.String) return map.getString(key);
    if (type == ReadableType.Number || type == ReadableType.Int || type == ReadableType.Long) {
      return map.getDouble(key);
    }
    return null;
  }
}
