import { describe, expect, test } from "vitest";

import { getAvatarContract, getAvatarInitials } from "./avatar.contract";

describe("Avatar contract", () => {
  test.each([
    ["Kim Ray", "KR"],
    ["mali", "M"],
    ["Élodie Martin", "ÉM"],
    ["김말랑", "김"],
    ["山田太郎", "山"],
    ["😊 말랑", undefined],
    ["42 Ray", undefined],
    [" ", undefined],
  ])("%s의 Initials를 규칙에 맞게 계산한다", (name, expected) => {
    expect(getAvatarInitials(name)).toBe(expected);
  });

  test("이미지 성공 전에는 Initials를 유지하고 성공 뒤 Image로 바꾼다", () => {
    const props = { imageSource: "https://example.com/avatar.png", name: "Kim Ray" } as const;
    expect(getAvatarContract(props, "loading").content).toBe("initials");
    expect(getAvatarContract(props, "error").content).toBe("initials");
    expect(getAvatarContract(props, "loaded").content).toBe("image");
  });

  test("이름과 이미지가 없으면 Placeholder를 쓰고 md를 기본 Size로 쓴다", () => {
    expect(getAvatarContract({})).toMatchObject({
      accessibilityElement: true,
      accessibilityLabel: "프로필 사진 없음",
      content: "placeholder",
      size: "md",
    });
  });

  test("접근성 hidden은 Avatar 전체를 장식으로 만든다", () => {
    expect(getAvatarContract({ name: "김말랑", accessibility: "hidden" })).toMatchObject({
      accessibilityElement: false,
      content: "initials",
    });
    expect(
      getAvatarContract({ name: "김말랑", accessibility: "hidden" }).accessibilityLabel,
    ).toBeUndefined();
  });

  test("명시한 접근성 이름은 전체 이름 기본값보다 우선한다", () => {
    expect(
      getAvatarContract({ name: "Kim Ray", accessibilityLabel: "대화 상대 Kim Ray" })
        .accessibilityLabel,
    ).toBe("대화 상대 Kim Ray");
  });

  test("공개 계약은 JavaScript의 잘못된 props를 명확하게 거부한다", () => {
    expect(() => getAvatarContract(undefined as never)).toThrow("Avatar props must be an object");
    expect(() => getAvatarContract({ size: "xxl" as never })).toThrow(
      "Avatar size must be xs, sm, md, lg, or xl",
    );
    expect(() => getAvatarContract({ accessibility: "visible" as never })).toThrow(
      "Avatar accessibility must be label or hidden",
    );
    expect(() => getAvatarContract({ name: 42 as never })).toThrow("Avatar name must be a string");
    expect(() => getAvatarContract({}, "complete" as never)).toThrow(
      "Avatar imageStatus must be idle, loading, loaded, or error",
    );
  });
});
