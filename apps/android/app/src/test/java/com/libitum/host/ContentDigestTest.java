package com.libitum.host;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** 받은 본문의 SHA-256 · UTF-8 바이트 수를 네이티브로 계산한다(ADR-0105 D4). JS 순수 구현과 같은 값이어야 한다. */
public final class ContentDigestTest {
  @Test public void emptyText() {
    assertEquals(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855:0", ContentDigest.of(""));
  }

  @Test public void asciiText() {
    assertEquals(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad:3",
        ContentDigest.of("abc"));
  }

  @Test public void koreanTextIsHashedAsUtf8() {
    assertEquals(
        "21c3c06eb1841c6ea8aed6f31b9c48bad037ab99e42187c0c4177242fe728ed9:18",
        ContentDigest.of("물 사기 — 가"));
  }

  @Test public void nullIsEmptyResult() {
    assertEquals("", ContentDigest.of(null));
  }
}
