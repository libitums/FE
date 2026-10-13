import { describe, expect, test } from "vitest";

import { fillPlaceholders, type LearnerProfile } from "./placeholder-fill";

// `unit` 계층: 순수 함수 `fillPlaceholders`의 입출력만 봅니다.

type Row = [text: string, profile: LearnerProfile, expected: string];

const KO_ROWS: Row[] = [
  ["{이름}(으)로 예약했어요.", { name: "민지" }, "민지로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "은정" }, "은정으로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "하늘" }, "하늘로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "Anna" }, "Anna로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "John" }, "John으로 예약했어요."],
  ["저는 {이름}이에요.", { name: "민지" }, "저는 민지예요."],
  ["저는 {이름}이에요.", { name: "은정" }, "저는 은정이에요."],
  ["{이름}은/는요?", { name: "민지" }, "민지는요?"],
  ["{이름}은/는요?", { name: "은정" }, "은정은요?"],
  ["저는 {나라}에서 왔어요.", { country: "스위스" }, "저는 스위스에서 왔어요."],
  ["{나라}은/는 멀어요.", { country: "한국" }, "한국은 멀어요."],
  ["{이름}(으)로 예약했어요.", {}, "이름으로 예약했어요."],
  ["{이름}(으)로 예약했어요.", { name: "  " }, "이름으로 예약했어요."],
];

const ROMAN_ROWS: Row[] = [
  ["{이름}(eu)ro yeyakaesseoyo.", { name: "민지" }, "민지ro yeyakaesseoyo."],
  ["{이름}(eu)ro yeyakaesseoyo.", { name: "은정" }, "은정euro yeyakaesseoyo."],
  ["jeoneun {이름}ieyo.", { name: "은정" }, "jeoneun 은정ieyo."],
  ["jeoneun {이름}ieyo.", { name: "민지" }, "jeoneun 민지yeyo."],
  ["{이름}eun/neunyo?", { name: "민지" }, "민지neunyo?"],
];

describe("fillPlaceholders", () => {
  test.each(KO_ROWS)("P1. ko %s / %j -> %s", (text, profile, expected) => {
    expect(fillPlaceholders(text, profile, "ko")).toBe(expected);
  });

  test.each(ROMAN_ROWS)("P2. roman %s / %j -> %s", (text, profile, expected) => {
    expect(fillPlaceholders(text, profile, "roman")).toBe(expected);
  });

  test("P2. roman 기본값은 ireum · nara", () => {
    expect(fillPlaceholders("{이름}!", {}, "roman")).toBe("ireum!");
    expect(fillPlaceholders("{나라}!", { country: " " }, "roman")).toBe("nara!");
  });

  test("P3. 토큰이 없는 문자열은 그대로이고 토큰 둘은 한 문장에서 모두 바뀐다", () => {
    expect(fillPlaceholders("안녕하세요.", { name: "민지" }, "ko")).toBe("안녕하세요.");
    expect(
      fillPlaceholders("{이름}은/는 {나라}에서 왔어요.", { name: "민지", country: "스위스" }, "ko"),
    ).toBe("민지는 스위스에서 왔어요.");
  });

  test.each([
    ["{이름} (으)로", "민지 (으)로"],
    ["{이름} 은/는", "민지 은/는"],
  ])("P4. 조사 표기가 토큰과 떨어져 있으면 바꾸지 않는다 (%s)", (text, expected) => {
    expect(fillPlaceholders(text, { name: "민지" }, "ko")).toBe(expected);
  });

  test.each([
    ["{이름}이/가", "민지", "민지가"],
    ["{이름}이/가", "은정", "은정이"],
    ["{이름}을/를", "민지", "민지를"],
    ["{이름}을/를", "은정", "은정을"],
  ])("P5. ko %s / %s -> %s", (text, name, expected) => {
    expect(fillPlaceholders(text, { name }, "ko")).toBe(expected);
  });

  test.each([
    ["{이름}i/ga", "민지", "민지ga"],
    ["{이름}i/ga", "은정", "은정i"],
    ["{이름}eul/reul", "민지", "민지reul"],
    ["{이름}eul/reul", "은정", "은정eul"],
  ])("P5. roman %s / %s -> %s", (text, name, expected) => {
    expect(fillPlaceholders(text, { name }, "roman")).toBe(expected);
  });

  // 이름 끝의 문장 부호 · 공백 · 이모지는 받침 판정에서 건너뛴다(값 표시는 그대로).
  test.each([
    ["{이름}(으)로", "민지!", "민지!로"],
    ["{이름}(으)로", "은정 ", "은정으로"], // 값의 앞뒤 공백은 표시에서도 걷는다
    ["{이름}은/는", "John.", "John.은"],
    ["{이름}은/는", "Anna😊", "Anna😊는"],
  ])("P6. ko %s / %j -> %s (끝 기호 건너뜀)", (text, name, expected) => {
    expect(fillPlaceholders(text, { name }, "ko")).toBe(expected);
  });
});

// ---- 3d-2: 영어 스크립트 · 나라의 세 표기 · 로마자 연음 ----

const GERMANY = { ko: "독일", roman: "dogil", en: "Germany" } as const;
const KOREA = { ko: "한국", roman: "hanguk", en: "South Korea" } as const;
const UNITED_STATES = { ko: "미국", roman: "miguk", en: "the United States" } as const;
const FRANCE = { ko: "프랑스", roman: "peurangseu", en: "France" } as const;
const AUSTRALIA = { ko: "호주", roman: "hoju", en: "Australia" } as const;
const JAPAN = { ko: "일본", roman: "ilbon", en: "Japan" } as const;
const HONG_KONG = { ko: "홍콩", roman: "hongkong", en: "Hong Kong" } as const;

describe("fillPlaceholders — en 스크립트", () => {
  test.each([...KO_ROWS, ...ROMAN_ROWS])(
    "PF-1. 프로필이 문자열 · 빈 값이면 en은 roman과 같다: %s / %j",
    (text, profile) => {
      expect(fillPlaceholders(text, profile, "en")).toBe(fillPlaceholders(text, profile, "roman"));
    },
  );

  test("PF-2. 나라 객체는 스크립트마다 다른 표기로 선다", () => {
    const profile = { country: GERMANY };

    expect(fillPlaceholders("저는 {나라}에서 왔어요.", profile, "ko")).toBe(
      "저는 독일에서 왔어요.",
    );
    expect(fillPlaceholders("I'm from {나라}.", profile, "en")).toBe("I'm from Germany.");
    expect(fillPlaceholders("{나라}", profile, "roman")).toBe("dogil");
    expect(fillPlaceholders("{나라}", profile, "en")).toBe("Germany");
  });

  test("PF-3. 관사가 든 영어 이름이 그대로 선다", () => {
    expect(fillPlaceholders("I'm from {나라}.", { country: UNITED_STATES }, "en")).toBe(
      "I'm from the United States.",
    );
  });

  test.each([
    ["{나라}(으)로", GERMANY, "독일로"],
    ["{나라}(으)로", UNITED_STATES, "미국으로"],
    ["{나라}(으)로", FRANCE, "프랑스로"],
    ["{나라}은/는", GERMANY, "독일은"],
    ["{나라}은/는", AUSTRALIA, "호주는"],
  ])("PF-4. ko 조사는 나라의 ko로 고른다: %s / %j -> %s", (text, country, expected) => {
    expect(fillPlaceholders(text, { country }, "ko")).toBe(expected);
  });
});

describe("fillPlaceholders — 로마자 연음", () => {
  test.each([
    [UNITED_STATES, "migugeseo"],
    [GERMANY, "dogireseo"],
    [JAPAN, "ilboneseo"],
    [HONG_KONG, "hongkongeseo"],
    [FRANCE, "peurangseueseo"],
  ])("PF-L1. 모음 앞에서 받침이 이어진다: %j -> %s", (country, expected) => {
    expect(fillPlaceholders("{나라}eseo", { country }, "roman")).toBe(expected);
  });

  test.each([
    ["{나라}(eu)ro", UNITED_STATES, "migugeuro"],
    ["{나라}(eu)ro", GERMANY, "dogillo"],
    ["{나라}(eu)ro", JAPAN, "ilboneuro"],
    ["{나라}(eu)ro", FRANCE, "peurangseuro"],
    ["{나라}eun/neun", UNITED_STATES, "migugeun"],
    ["{나라}eun/neun", GERMANY, "dogireun"],
    ["{나라}eun/neun", AUSTRALIA, "hojuneun"],
    ["{나라}i/ga", UNITED_STATES, "migugi"],
    ["{나라}i/ga", AUSTRALIA, "hojuga"],
  ])("PF-L2. 조사와 연음이 함께 선다: %s / %j -> %s", (text, country, expected) => {
    expect(fillPlaceholders(text, { country }, "roman")).toBe(expected);
  });

  test.each([
    ["{나라} saram", UNITED_STATES, "miguk saram"],
    ["{나라}.", GERMANY, "dogil."],
    ["{나라}", UNITED_STATES, "miguk"],
    ["{나라}?", KOREA, "hanguk?"],
  ])("PF-L3. 뒤가 모음이 아니면 그대로다: %s / %j -> %s", (text, country, expected) => {
    expect(fillPlaceholders(text, { country }, "roman")).toBe(expected);
  });

  test("PF-L4. 연음은 나라 객체에만 건다 — 이름과 나라 문자열은 그대로다", () => {
    expect(fillPlaceholders("{이름}(eu)ro", { name: "John" }, "roman")).toBe("Johneuro");
    expect(fillPlaceholders("{이름}eseo", { name: "Jack" }, "roman")).toBe("Jackeseo");
    expect(fillPlaceholders("{나라}eseo", { country: "스위스" }, "roman")).toBe("스위스eseo");
  });
});

describe("fillPlaceholders — 이름과 나라가 함께", () => {
  test("PF-5. 이름은 세 스크립트에 같은 값으로 선다", () => {
    const profile = { name: "Emma" };

    expect(fillPlaceholders("{이름}(으)로 예약했어요.", profile, "ko")).toBe("Emma로 예약했어요.");
    expect(fillPlaceholders("{이름}(eu)ro yeyakaesseoyo.", profile, "roman")).toBe(
      "Emmaro yeyakaesseoyo.",
    );
    expect(fillPlaceholders("I booked under {이름}.", profile, "en")).toBe("I booked under Emma.");
  });

  test("PF-6. 한 문장에 이름과 나라가 둘 다 선다", () => {
    const profile = { name: "Emma", country: KOREA };

    expect(fillPlaceholders("{이름}은/는 {나라}에서 왔어요.", profile, "ko")).toBe(
      "Emma는 한국에서 왔어요.",
    );
    expect(fillPlaceholders("{이름} is from {나라}.", profile, "en")).toBe(
      "Emma is from South Korea.",
    );
  });

  test("PF-7. 나라 객체의 ko가 공백뿐이면 기본 문구로 서고 던지지 않는다", () => {
    const profile = { country: { ko: "   ", roman: "x", en: "Y" } };

    expect(() => fillPlaceholders("{나라}에서", profile, "ko")).not.toThrow();
    expect(fillPlaceholders("{나라}에서", profile, "ko")).toBe("나라에서");
    expect(fillPlaceholders("{나라}", profile, "roman")).toBe("nara");
    expect(fillPlaceholders("{나라}", profile, "en")).toBe("nara");
  });

  test("PF-8. 이름만 있고 나라 키가 없으면 {나라}는 기본 문구다", () => {
    expect(fillPlaceholders("저는 {나라}에서 왔어요.", { name: "Emma" }, "ko")).toBe(
      "저는 나라에서 왔어요.",
    );
    expect(fillPlaceholders("I'm from {나라}.", { name: "Emma" }, "en")).toBe("I'm from nara.");
  });
});
