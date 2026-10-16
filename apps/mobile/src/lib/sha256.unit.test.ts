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
    ["u01-water", "2216d5e35ec4b2240d7e0353c932d6fe7f4f408b1434183cea35188bdff5b85f", 125327],
    ["u02-checkin", "8084b452acc6c3f5655c33dfb1bb8e4ef230604a8eb4bfd2516a6f5912032448", 159188],
    ["u03-mina", "e5f94a0cbee1548687a82139dea5260e0dd3e300e1d87831e8269667dfd9bfcd", 154196],
  ])("H5. 픽스처 %s 원문의 해시와 바이트 수가 부록 값과 같다", (id, sha256, bytes) => {
    const text = readFileSync(resolve(process.cwd(), `content/episodes/${id}.json`), "utf8");
    expect(utf8Bytes(text).length).toBe(bytes);
    expect(sha256Hex(utf8Bytes(text))).toBe(sha256);
  });
});
