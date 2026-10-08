import { describe, expect, it } from "vitest";
import type { ClickedLink } from "./analytics.contract";
import { clickEventOf, faqEventOf, sectionEventOf } from "./analytics-events";

const plain: ClickedLink = { store: undefined, hash: "", inLanguageMenu: false, hreflang: "" };

describe("clickEventOf", () => {
  it("U-CE1 링크가 없으면 null", () => {
    expect(clickEventOf(null)).toBeNull();
  });

  it("U-CE2 아무 조건도 없는 링크는 null", () => {
    expect(clickEventOf(plain)).toBeNull();
  });

  it("U-CE3 store가 ios이면 download_click", () => {
    expect(clickEventOf({ ...plain, store: "ios" })).toEqual({
      name: "download_click",
      params: { store: "ios" },
    });
  });

  it("U-CE4 store가 android이면 download_click", () => {
    expect(clickEventOf({ ...plain, store: "android" })).toEqual({
      name: "download_click",
      params: { store: "android" },
    });
  });

  it("U-CE5 hash가 #download이면 cta_click", () => {
    expect(clickEventOf({ ...plain, hash: "#download" })).toEqual({
      name: "cta_click",
      params: { location: "header" },
    });
  });

  it("U-CE6 store가 hash보다 앞선다", () => {
    expect(clickEventOf({ ...plain, store: "ios", hash: "#download" })).toEqual({
      name: "download_click",
      params: { store: "ios" },
    });
  });

  it("U-CE7 빈 store는 없는 것으로 보고 cta_click", () => {
    expect(clickEventOf({ ...plain, store: "", hash: "#download" })).toEqual({
      name: "cta_click",
      params: { location: "header" },
    });
  });

  it("U-CE8 다른 hash는 null", () => {
    expect(clickEventOf({ ...plain, hash: "#faq" })).toBeNull();
    expect(clickEventOf({ ...plain, hash: "#top" })).toBeNull();
  });

  it("U-CE9 언어 메뉴 안의 링크는 language_switch", () => {
    expect(clickEventOf({ ...plain, inLanguageMenu: true, hreflang: "ko" })).toEqual({
      name: "language_switch",
      params: { to: "ko" },
    });
  });

  it("U-CE10 hash가 언어 메뉴보다 앞선다", () => {
    expect(
      clickEventOf({ ...plain, inLanguageMenu: true, hreflang: "ko", hash: "#download" }),
    ).toEqual({ name: "cta_click", params: { location: "header" } });
  });

  it("U-CE11 hreflang이 비어도 언어 메뉴 링크는 language_switch를 보낸다", () => {
    expect(clickEventOf({ ...plain, inLanguageMenu: true, hreflang: "" })).toEqual({
      name: "language_switch",
      params: { to: "" },
    });
  });

  it("U-CE12 입력을 바꾸지 않고 같은 입력에 같은 결과를 새 객체로 낸다", () => {
    const input = Object.freeze({ ...plain, store: "ios" });
    const first = clickEventOf(input);
    const second = clickEventOf(input);
    expect(first).not.toBeNull();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});

describe("faqEventOf", () => {
  it("U-FE1 열릴 때 faq_open", () => {
    expect(faqEventOf({ faqId: "what", open: true })).toEqual({
      name: "faq_open",
      params: { question: "what" },
    });
  });

  it("U-FE2 닫힐 때는 null", () => {
    expect(faqEventOf({ faqId: "what", open: false })).toBeNull();
  });

  it("U-FE3 faqId가 없으면 빈 문자열로 보낸다", () => {
    expect(faqEventOf({ faqId: undefined, open: true })).toEqual({
      name: "faq_open",
      params: { question: "" },
    });
  });

  it("U-FE4 열 때마다 같은 결과를 낸다", () => {
    const expected = { name: "faq_open", params: { question: "where" } };
    expect(faqEventOf({ faqId: "where", open: true })).toEqual(expected);
    expect(faqEventOf({ faqId: "where", open: true })).toEqual(expected);
  });
});

describe("sectionEventOf", () => {
  it("U-SE1 보이기 시작하면 section_view", () => {
    expect(sectionEventOf({ id: "faq", isIntersecting: true })).toEqual({
      name: "section_view",
      params: { section: "faq" },
    });
  });

  it("U-SE2 보이지 않으면 null", () => {
    expect(sectionEventOf({ id: "faq", isIntersecting: false })).toBeNull();
  });

  it("U-SE3 id가 비어 있으면 null", () => {
    expect(sectionEventOf({ id: "", isIntersecting: true })).toBeNull();
  });

  it("U-SE4 섹션 id를 그대로 section에 담는다", () => {
    for (const id of ["top", "manifesto", "ways", "journey", "words"]) {
      expect(sectionEventOf({ id, isIntersecting: true })).toEqual({
        name: "section_view",
        params: { section: id },
      });
    }
  });
});
