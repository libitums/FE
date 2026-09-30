import { describe, expect, test } from "vitest";

import { base64UrlFromBytes, bytesFromBase64, bytesFromBase64Url, utf8Bytes } from "./base64.ts";

const hello = [104, 101, 108, 108, 111];

describe("FB1 base64UrlFromBytes", () => {
  test("빈 입력은 빈 문자열이다", () => {
    expect(base64UrlFromBytes(new Uint8Array([]))).toBe("");
  });

  test("URL 안전 알파벳(- _)을 쓰고 패딩이 없다", () => {
    expect(base64UrlFromBytes(new Uint8Array([0xfb, 0xff]))).toBe("-_8");
  });

  test("UTF-8 hello는 aGVsbG8다", () => {
    expect(base64UrlFromBytes(new Uint8Array(hello))).toBe("aGVsbG8");
  });

  test("utf8Bytes는 UTF-8 바이트를 낸다", () => {
    expect(Array.from(utf8Bytes("hello"))).toEqual(hello);
    expect(Array.from(utf8Bytes("한"))).toEqual([0xed, 0x95, 0x9c]);
  });
});

describe("FB2 bytesFromBase64 · bytesFromBase64Url", () => {
  test("base64url은 위 벡터의 역이다", () => {
    expect(Array.from(bytesFromBase64Url("-_8") ?? [])).toEqual([0xfb, 0xff]);
    expect(Array.from(bytesFromBase64Url("aGVsbG8") ?? [])).toEqual(hello);
    expect(Array.from(bytesFromBase64Url("") ?? [1])).toEqual([]);
  });

  test("표준 base64는 패딩을 허용하고 + / 알파벳을 읽는다", () => {
    expect(Array.from(bytesFromBase64("aGk=") ?? [])).toEqual([104, 105]);
    expect(Array.from(bytesFromBase64("aGVsbG8=") ?? [])).toEqual(hello);
    expect(Array.from(bytesFromBase64("+/8=") ?? [])).toEqual([0xfb, 0xff]);
  });

  test.each(["a!b", "a b", "한글", "aGk=="])(
    "알파벳 밖 글자 %j는 null이다(던지지 않는다)",
    (text) => {
      expect(() => bytesFromBase64(text)).not.toThrow();
      expect(bytesFromBase64(text)).toBeNull();
    },
  );

  test.each(["a+b", "a/b", "a=b", "한"])("base64url은 %j를 null로 돌린다", (text) => {
    expect(() => bytesFromBase64Url(text)).not.toThrow();
    expect(bytesFromBase64Url(text)).toBeNull();
  });
});
