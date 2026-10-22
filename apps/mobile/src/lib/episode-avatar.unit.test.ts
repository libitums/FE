import { describe, expect, test } from "vitest";

import { counterpartAvatarPathOf } from "./episode-avatar";

// `unit` 계층: 상대 아바타 경로를 읽는 순수 함수의 입출력만 봅니다.

describe("counterpartAvatarPathOf", () => {
  test.each([
    ["images/avatars/u00.webp", "images/avatars/u00.webp"],
    ["content/images/avatars/u00.webp", "content/images/avatars/u00.webp"],
    [" images/a.PNG ", "images/a.PNG"],
    ["images/a.jpg", "images/a.jpg"],
    ["images/a.jpeg", "images/a.jpeg"],
  ])("AV1. %j 는 경로로 읽고 값은 trim한다", (raw, path) => {
    expect(counterpartAvatarPathOf(raw)).toEqual({ kind: "path", path });
  });

  test.each([[null], [undefined], [""], ["   "]])("AV2. %j 는 없음이다", (raw) => {
    expect(counterpartAvatarPathOf(raw)).toEqual({ kind: "absent" });
  });

  test.each([
    ["/images/a.webp"],
    ["../a.webp"],
    ["images/../a.webp"],
    ["https://x/a.webp"],
    ["images/a.gif"],
    ["images/a"],
    ["images/a b.webp"],
    ["images/a.webp?x"],
    ["images/a.webp#y"],
  ])("AV3. %j 는 어긋난 값이다", (raw) => {
    expect(counterpartAvatarPathOf(raw).kind).toBe("invalid");
  });

  test("어긋난 값은 원문을 싣는다", () => {
    expect(counterpartAvatarPathOf("images/a.gif")).toEqual({
      kind: "invalid",
      raw: "images/a.gif",
    });
  });
});
