package com.libitum.host;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * SSE 응답 바이트를 빈 줄 경계에서 잘라 이벤트 블록 하나씩 UTF-8 문자열로 푼다. 경계는 ASCII라서 한글 같은 다바이트
 * 글자가 조각 사이에서 갈려도 블록 안에 온전히 모인 뒤에 풀린다. 줄 끝은 {@code \n} · {@code \r\n} · {@code \r}
 * (SSE 규칙). 블록 끝의 줄바꿈은 싣지 않는다. iOS {@code SseEventSplitter}와 같은 규칙이다.
 */
public final class SseEventSplitter {
  private static final byte LF = 0x0A;
  private static final byte CR = 0x0D;

  private byte[] buffer = new byte[0];

  public List<String> push(byte[] bytes, int length) {
    byte[] joined = Arrays.copyOf(buffer, buffer.length + length);
    System.arraycopy(bytes, 0, joined, buffer.length, length);
    buffer = joined;

    List<String> blocks = new ArrayList<>();
    int blockStart = 0;
    int lineStart = 0;
    int contentEnd = 0;
    int i = 0;
    while (i < buffer.length) {
      byte b = buffer[i];
      if (b != LF && b != CR) {
        i++;
        continue;
      }
      int width = 1;
      if (b == CR) {
        if (i + 1 < buffer.length) {
          if (buffer[i + 1] == LF) width = 2;
        } else if (i != lineStart) {
          // 내용 줄 끝의 \r이 마지막 바이트면 \r\n인지 다음 조각을 봐야 안다.
          break;
        }
      }
      if (i == lineStart) {
        if (lineStart > blockStart) blocks.add(decode(blockStart, contentEnd));
        blockStart = i + width;
      } else {
        contentEnd = i;
      }
      i += width;
      lineStart = i;
    }
    buffer = Arrays.copyOfRange(buffer, blockStart, buffer.length);
    return blocks;
  }

  /** 스트림이 끝날 때 남은 블록(빈 줄 없이 끝난 것)을 낸다. */
  public List<String> finish() {
    int end = buffer.length;
    while (end > 0 && (buffer[end - 1] == LF || buffer[end - 1] == CR)) end--;
    int start = 0;
    while (start < end && (buffer[start] == LF || buffer[start] == CR)) start++;
    List<String> blocks = new ArrayList<>();
    if (start < end) blocks.add(decode(start, end));
    buffer = new byte[0];
    return blocks;
  }

  private String decode(int from, int to) {
    return new String(buffer, from, to - from, StandardCharsets.UTF_8);
  }

  /** 오류 본문을 상한까지만 모은다. */
  static void appendCapped(ByteArrayOutputStream out, byte[] bytes, int length, int cap) {
    int room = cap - out.size();
    if (room > 0) out.write(bytes, 0, Math.min(room, length));
  }
}
