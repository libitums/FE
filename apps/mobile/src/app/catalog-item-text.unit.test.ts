import { describe, expect, test } from "vitest";

import { choiceRomanizationsOf } from "./catalog-item-text";
import { portOf } from "./catalog-screens.test-support";

// `unit` 계층: 보기 로마자 원문 배열을 표시 순서의 (string | null)[]로 정규화하는 순수 함수의 입출력만 봅니다.

const port = portOf();

describe("choiceRomanizationsOf", () => {
  test("CR5. 앞뒤 공백을 걷고 길이와 순서를 그대로 보존한다", () => {
    expect(choiceRomanizationsOf(port, ["  annyeong ", "ne", "gamsahamnida"])).toEqual([
      "annyeong",
      "ne",
      "gamsahamnida",
    ]);
  });

  test("CR5. 자리표시자는 로마자 자리로 치환한다", () => {
    expect(choiceRomanizationsOf(port, ["{이름}-ssi", "ne"])).toEqual(["mina-ssi", "ne"]);
  });

  test("CR5. 빈 문자열 · 공백뿐 · undefined인 자리는 null이다", () => {
    expect(choiceRomanizationsOf(port, ["a", "", "   ", undefined, "b"])).toEqual([
      "a",
      null,
      null,
      null,
      "b",
    ]);
  });

  test("CR5. 전부 비면 undefined다(키를 싣지 않게)", () => {
    expect(choiceRomanizationsOf(port, ["", "  ", undefined])).toBeUndefined();
    expect(choiceRomanizationsOf(port, [])).toBeUndefined();
  });

  test("CR5. 입력 배열을 바꾸지 않는다", () => {
    const romans = [" a ", undefined];

    choiceRomanizationsOf(port, romans);

    expect(romans).toEqual([" a ", undefined]);
  });
});
