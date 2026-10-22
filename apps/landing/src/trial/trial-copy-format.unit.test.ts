import { describe, expect, it } from "vitest";

import { formatCopy } from "./trial-copy-format";

// `unit` 계층: 문구의 `{name}` 자리표시자 치환.

describe("formatCopy", () => {
  it("TF1 이름마다 값으로 바꾼다", () => {
    expect(formatCopy("Line {ordinal} of {total}", { ordinal: "1", total: "3" })).toBe(
      "Line 1 of 3",
    );
  });

  it("TF1 모르는 이름은 그대로 둔다", () => {
    expect(formatCopy("You said: {heard}", { other: "x" })).toBe("You said: {heard}");
    expect(formatCopy("Answer: {answer}", {})).toBe("Answer: {answer}");
  });

  it("TF1 같은 이름이 두 번 나오면 둘 다 바꾼다", () => {
    expect(formatCopy("{a} and {a}", { a: "x" })).toBe("x and x");
  });

  it("TF1 값 안의 중괄호 · $ 패턴은 다시 치환하지 않는다", () => {
    expect(formatCopy("{a}{b}", { a: "{b}", b: "y" })).toBe("{b}y");
    expect(formatCopy("You said: {heard}", { heard: "$& $1" })).toBe("You said: $& $1");
  });
});
