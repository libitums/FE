package com.libitum.host;

import static org.junit.Assert.assertEquals;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;

/** iOS `ChatStreamModuleTests`(CSN1 ~ CSN7)와 같은 표. 네트워크는 수동 e2e(CS-E2)가 본다. */
public final class SseEventSplitterTest {
  private static List<String> push(SseEventSplitter splitter, String text) {
    byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
    return splitter.push(bytes, bytes.length);
  }

  private static List<String> list(String... items) {
    return Arrays.asList(items);
  }

  @Test public void csn1SplitsBlocksOnBlankLine() {
    SseEventSplitter splitter = new SseEventSplitter();
    assertEquals(
        list("event: delta\ndata: a", "event: done\ndata: {}"),
        push(splitter, "event: delta\ndata: a\n\nevent: done\ndata: {}\n\n"));
    assertEquals(Collections.emptyList(), splitter.finish());
  }

  @Test public void csn2BuffersAcrossChunks() {
    SseEventSplitter splitter = new SseEventSplitter();
    assertEquals(Collections.emptyList(), push(splitter, "event: delta\nda"));
    assertEquals(Collections.emptyList(), push(splitter, "ta: a\n"));
    assertEquals(list("event: delta\ndata: a"), push(splitter, "\nevent: x"));
  }

  @Test public void csn3KoreanSplitMidCharacter() {
    SseEventSplitter splitter = new SseEventSplitter();
    byte[] whole = "data: 안녕\n\n".getBytes(StandardCharsets.UTF_8);
    int cut = 7; // "data: " 6바이트 + 「안」의 첫 바이트
    assertEquals(Collections.emptyList(), splitter.push(Arrays.copyOfRange(whole, 0, cut), cut));
    byte[] rest = Arrays.copyOfRange(whole, cut, whole.length);
    assertEquals(list("data: 안녕"), splitter.push(rest, rest.length));
  }

  @Test public void csn4CrlfAndCrBoundaries() {
    SseEventSplitter splitter = new SseEventSplitter();
    assertEquals(list("data: a", "data: b"), push(splitter, "data: a\r\n\r\ndata: b\r\r"));
    assertEquals(Collections.emptyList(), push(splitter, "data: c\r"));
    assertEquals(list("data: c"), push(splitter, "\n\r"));
    assertEquals(list("data: d"), push(splitter, "\ndata: d\n\n"));
  }

  @Test public void csn5FinishFlushesTrailingBlock() {
    SseEventSplitter splitter = new SseEventSplitter();
    assertEquals(Collections.emptyList(), push(splitter, "data: tail"));
    assertEquals(list("data: tail"), splitter.finish());
    SseEventSplitter empty = new SseEventSplitter();
    assertEquals(Collections.emptyList(), push(empty, "\n"));
    assertEquals(Collections.emptyList(), empty.finish());
  }

  @Test public void csn6CommentBlocksPassThrough() {
    SseEventSplitter splitter = new SseEventSplitter();
    assertEquals(list(": ping"), push(splitter, ": ping\n\n"));
  }

  @Test public void csn7Limits() {
    assertEquals(10_000L, ChatStreamLimits.CONNECT_TIMEOUT_MS);
    assertEquals(30_000L, ChatStreamLimits.IDLE_TIMEOUT_MS);
    assertEquals(65_536, ChatStreamLimits.ERROR_BODY_BYTES);
  }

  @Test public void pushUsesOnlyGivenLength() {
    SseEventSplitter splitter = new SseEventSplitter();
    byte[] bytes = "data: a\n\nGARBAGE".getBytes(StandardCharsets.UTF_8);
    assertEquals(list("data: a"), splitter.push(bytes, 9));
    assertEquals(Collections.emptyList(), splitter.finish());
  }
}
