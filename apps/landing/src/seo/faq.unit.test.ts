import { describe, expect, it } from "vitest";
import { buildFaq, faqIds, storeAvailabilityOf } from "./faq";
import type { FaqCopy, FaqCopyKey } from "./seo.contract";

const copyKeys: readonly FaqCopyKey[] = [
  "faqWhatQ",
  "faqWhatA",
  "faqWhoQ",
  "faqWhoA",
  "faqDifferentQ",
  "faqDifferentA",
  "faqActivitiesQ",
  "faqActivitiesA",
  "faqHangulQ",
  "faqHangulA",
  "faqLanguageQ",
  "faqLanguageA",
  "faqWhereQ",
  "faqWhereASoon",
  "faqWhereAAvailable",
];

const stubCopy = (overrides: Partial<FaqCopy> = {}): FaqCopy => {
  const copy = Object.fromEntries(copyKeys.map((key) => [key, `[${key}]`])) as FaqCopy;
  return { ...copy, ...overrides };
};

const capitalize = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

describe("faq", () => {
  it("U-FQ1 faqIds 순서", () => {
    expect([...faqIds]).toEqual([
      "what",
      "who",
      "different",
      "activities",
      "hangul",
      "language",
      "where",
    ]);
  });

  it("U-FQ2 스토어 주소가 없으면 coming-soon", () => {
    expect(storeAvailabilityOf({ ios: "", android: "" })).toBe("coming-soon");
    expect(storeAvailabilityOf({ ios: "  ", android: " \t" })).toBe("coming-soon");
  });

  it("U-FQ3 하나라도 있으면 available", () => {
    expect(storeAvailabilityOf({ ios: "https://apps.example/ios", android: "" })).toBe("available");
    expect(storeAvailabilityOf({ ios: "", android: "https://play.example/a" })).toBe("available");
    expect(
      storeAvailabilityOf({ ios: "https://apps.example/ios", android: "https://play.example/a" }),
    ).toBe("available");
  });

  it("U-FQ4 일곱 항목이 faqIds 순서이고 각자 자기 키를 읽는다", () => {
    const faq = buildFaq({ copy: stubCopy(), storeAvailability: "coming-soon" });
    expect(faq).toHaveLength(7);
    expect(faq.map((entry) => entry.id)).toEqual([...faqIds]);
    for (const entry of faq) {
      expect(entry.question).toBe(`[faq${capitalize(entry.id)}Q]`);
    }
    for (const entry of faq.filter((item) => item.id !== "where")) {
      expect(entry.answer).toBe(`[faq${capitalize(entry.id)}A]`);
    }
  });

  it("U-FQ5 coming-soon이면 where는 faqWhereASoon", () => {
    const faq = buildFaq({ copy: stubCopy(), storeAvailability: "coming-soon" });
    expect(faq.find((entry) => entry.id === "where")?.answer).toBe("[faqWhereASoon]");
  });

  it("U-FQ6 available이면 where만 faqWhereAAvailable로 바뀐다", () => {
    const soon = buildFaq({ copy: stubCopy(), storeAvailability: "coming-soon" });
    const available = buildFaq({ copy: stubCopy(), storeAvailability: "available" });
    expect(available.find((entry) => entry.id === "where")?.answer).toBe("[faqWhereAAvailable]");
    expect(available.filter((entry) => entry.id !== "where")).toEqual(
      soon.filter((entry) => entry.id !== "where"),
    );
  });

  it("U-FQ7 빈 값 · 공백뿐인 값은 던진다", () => {
    expect(buildFaq({ copy: stubCopy(), storeAvailability: "coming-soon" })).toHaveLength(7);
    expect(() =>
      buildFaq({ copy: stubCopy({ faqWhatQ: "" }), storeAvailability: "coming-soon" }),
    ).toThrow(/\S/);
    expect(() =>
      buildFaq({ copy: stubCopy({ faqWhoA: "   " }), storeAvailability: "coming-soon" }),
    ).toThrow(/\S/);
    expect(() =>
      buildFaq({ copy: stubCopy({ faqWhereAAvailable: "" }), storeAvailability: "available" }),
    ).toThrow(/\S/);
  });

  it("U-FQ8 태그가 섞인 값은 던진다", () => {
    expect(buildFaq({ copy: stubCopy(), storeAvailability: "coming-soon" })).toHaveLength(7);
    expect(() =>
      buildFaq({ copy: stubCopy({ faqWhatA: "a<br />b" }), storeAvailability: "coming-soon" }),
    ).toThrow(/\S/);
    expect(() =>
      buildFaq({ copy: stubCopy({ faqLanguageQ: "a<b" }), storeAvailability: "coming-soon" }),
    ).toThrow(/\S/);
  });

  it("U-FQ9 같은 입력이면 같은 결과", () => {
    const first = buildFaq({ copy: stubCopy(), storeAvailability: "coming-soon" });
    const second = buildFaq({ copy: stubCopy(), storeAvailability: "coming-soon" });
    expect(second).toEqual(first);
  });
});
