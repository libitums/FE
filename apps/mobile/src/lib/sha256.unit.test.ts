import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { sha256Hex, utf8Bytes } from "./sha256";

// `unit` 계층: 순수 함수 `sha256Hex` · `utf8Bytes`의 입출력만 봅니다.

describe("sha256", () => {
  test("H1. 빈 문자열의 해시", () => {
    expect(sha256Hex(utf8Bytes(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  test("H2. abc의 해시", () => {
    expect(sha256Hex(utf8Bytes("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("H3. 56바이트 입력(패딩 경계)의 해시", () => {
    const text = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
    expect(utf8Bytes(text)).toHaveLength(56);
    expect(sha256Hex(utf8Bytes(text))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  test("H4. 한글은 UTF-8 여섯 바이트가 된다", () => {
    const bytes = utf8Bytes("한글");
    expect(bytes).toHaveLength(6);
    expect([...bytes]).toEqual([0xed, 0x95, 0x9c, 0xea, 0xb8, 0x80]);
  });

  test.each([
    ["u01-water", "8318e0dab44c4ff94fb904eaa92175b9df70a0cd4f7feb1d84e4402a7b487ff1", 126449],
    ["u02-checkin", "b249328f2279c03d803a45b36e693aa39070e2195aee496e9bcbd373ff360cba", 160563],
    ["u03-mina", "0694fd2d2c4bc48b156e61c16ab8ae0c4b09c95030df749c6db54a3ad17421a3", 155429],
  ])("H5. 픽스처 %s 원문의 해시와 바이트 수가 부록 값과 같다", (id, sha256, bytes) => {
    const text = readFileSync(resolve(process.cwd(), `content/episodes/${id}.json`), "utf8");
    expect(utf8Bytes(text).length).toBe(bytes);
    expect(sha256Hex(utf8Bytes(text))).toBe(sha256);
  });

  test.each([
    ["u01-water", "56cc484dce9dfa05410ff1dce696e47abe4091452b873cdd81e5c5f16ae48c94", 79485],
    ["u02-checkin", "bfddd0e681d7016c1099f256361a6ae4dc61a87fb74e40dd48d9355750ecbbc6", 121908],
    ["u03-mina", "3015accf92a7190b88efd770a8d961acbc7ef2f095f3601c4e7bf5e96e34f24a", 98497],
  ])("H5L. 옛 내장본 픽스처 %s는 바이트 그대로다", (id, sha256, bytes) => {
    const path = `content/test-fixtures/delivery-2-2026-10-14/${id}.json`;
    const text = readFileSync(resolve(process.cwd(), path), "utf8");
    expect(utf8Bytes(text).length).toBe(bytes);
    expect(sha256Hex(utf8Bytes(text))).toBe(sha256);
  });
});
