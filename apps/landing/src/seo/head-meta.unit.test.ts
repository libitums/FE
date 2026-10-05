import { describe, expect, it } from "vitest";
import { buildHeadMeta, robotsIndexable, robotsNoindex } from "./head-meta";
import type { HeadMetaInput, LanguageRoute } from "./seo.contract";

const routes: readonly LanguageRoute[] = [
  { language: "en", path: "/", locale: "en_US" },
  { language: "ko", path: "/ko/", locale: "ko_KR" },
];

const input = (overrides: Partial<HeadMetaInput> = {}): HeadMetaInput => ({
  siteUrl: "https://example.test",
  language: "en",
  routes,
  imagePath: "/og-en.jpg",
  ...overrides,
});

describe("head-meta", () => {
  it("U-HM1 robots 상수", () => {
    expect(robotsIndexable).toContain("max-image-preview:large");
    expect(robotsIndexable).not.toContain("noindex");
    expect(robotsNoindex).toBe("noindex");
  });

  it("U-HM2 주소가 없으면 absolute가 없고 로캘은 나온다", () => {
    const meta = buildHeadMeta(input({ siteUrl: "", language: "en" }));
    expect(meta.absolute).toBeUndefined();
    expect(meta.ogLocale).toBe("en_US");
    expect(meta.ogLocaleAlternates).toEqual(["ko_KR"]);
  });

  it("U-HM3 영어 canonical · imageUrl", () => {
    const meta = buildHeadMeta(input());
    expect(meta.absolute?.canonical).toBe("https://example.test/");
    expect(meta.absolute?.imageUrl).toBe("https://example.test/og-en.jpg");
  });

  it("U-HM4 한국어 canonical · 로캘", () => {
    const meta = buildHeadMeta(input({ language: "ko" }));
    expect(meta.absolute?.canonical).toBe("https://example.test/ko/");
    expect(meta.ogLocale).toBe("ko_KR");
    expect(meta.ogLocaleAlternates).toEqual(["en_US"]);
  });

  it("U-HM5 alternates는 두 언어에서 같은 순서 · 길이 3", () => {
    const expected = [
      { hreflang: "en", href: "https://example.test/" },
      { hreflang: "ko", href: "https://example.test/ko/" },
      { hreflang: "x-default", href: "https://example.test/" },
    ];
    expect(buildHeadMeta(input()).absolute?.alternates).toEqual(expected);
    expect(buildHeadMeta(input({ language: "ko" })).absolute?.alternates).toEqual(expected);
  });

  it("U-HM6 언어 셋이면 alternates 4개, ogLocaleAlternates 2개", () => {
    const three: readonly LanguageRoute[] = [
      ...routes,
      { language: "ja", path: "/ja/", locale: "ja_JP" },
    ];
    const meta = buildHeadMeta(input({ routes: three }));
    expect(meta.absolute?.alternates).toHaveLength(4);
    expect(meta.absolute?.alternates.at(-1)?.hreflang).toBe("x-default");
    expect(meta.ogLocaleAlternates).toHaveLength(2);
  });

  it("U-HM7 href에 슬래시가 겹치지 않는다", () => {
    for (const language of ["en", "ko"]) {
      const absolute = buildHeadMeta(input({ language })).absolute;
      const hrefs = [
        absolute?.canonical ?? "",
        absolute?.imageUrl ?? "",
        ...(absolute?.alternates.map((a) => a.href) ?? []),
      ];
      expect(hrefs.every((href) => href.length > 0)).toBe(true);
      for (const href of hrefs) {
        expect(href.replace(/^https:\/\//, "")).not.toContain("//");
      }
    }
  });

  it("U-HM8 잘못된 입력은 던진다", () => {
    expect(buildHeadMeta(input()).absolute?.canonical).toBe("https://example.test/");
    expect(() => buildHeadMeta(input({ routes: [] }))).toThrow(/\S/);
    expect(() => buildHeadMeta(input({ language: "fr" }))).toThrow(/\S/);
    expect(() => buildHeadMeta(input({ imagePath: "og.jpg" }))).toThrow(/\S/);
    expect(() =>
      buildHeadMeta(
        input({
          routes: [
            { language: "en", path: "/", locale: "en_US" },
            { language: "ko", path: "ko/", locale: "ko_KR" },
          ],
        }),
      ),
    ).toThrow(/\S/);
  });
});
