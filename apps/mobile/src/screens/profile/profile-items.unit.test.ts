import { describe, expect, it } from "vitest";
import { profileItems } from "./profile-items";
import { profileEn } from "../../lib/ui-copy-en-account";

const token = (payload: unknown) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;

describe("profileItems", () => {
  it("한글·이모지 이름 및 계정 연락처를 손실 없이 표시한다", () => {
    expect(
      profileItems(
        token({
          user_metadata: { full_name: "김하늘 🌿" },
          email: "hello@example.test",
          phone: "+821012345678",
        }),
        profileEn,
      ),
    ).toEqual([
      { id: "name", value: "김하늘 🌿" },
      { id: "email", value: "hello@example.test" },
      { id: "phone", value: "+821012345678" },
      { id: "learning-language", value: "Korean" },
    ]);
  });
  it.each([
    null,
    "invalid",
    token({}),
    token({ user_metadata: [] }),
    token({ user_metadata: { full_name: 42 }, email: " ", phone: null }),
  ])("없는 정보와 잘못된 데이터는 미등록 문구로 표시한다: %s", (value) => {
    expect(
      profileItems(value, profileEn)
        .slice(0, 3)
        .map((item) => item.value),
    ).toEqual(["Not provided", "Not provided", "Not provided"]);
  });
  it("제공자별 이름 필드와 빈 이름을 처리한다", () => {
    expect(
      profileItems(token({ user_metadata: { full_name: " ", name: " Hana " } }), profileEn)[0]
        .value,
    ).toBe("Hana");
    expect(
      profileItems(token({ user_metadata: { display_name: "Hana" } }), profileEn)[0].value,
    ).toBe("Hana");
  });
  it("잘못된 UTF-8도 예외 없이 미등록으로 처리한다", () => {
    expect(profileItems("header._w.signature", profileEn)[0].value).toBe("Not provided");
  });
});
