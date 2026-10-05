import { beforeAll, describe, expect, it } from "vitest";
import { en } from "../i18n/copy";
import { defaultLanguage, languages, pages, pathFor } from "../site";
import NotFound from "./NotFound.astro";
import { render } from "./render.support";

describe("NotFound", () => {
  let html: string;
  let document: Document;

  beforeAll(async () => {
    ({ html, document } = await render(NotFound, { props: { language: defaultLanguage } }));
  });

  it("UI-NF1 문서", () => {
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.title).toBe(en.notFoundMetaTitle);
  });

  it("UI-NF2 robots", () => {
    const robots = document.querySelectorAll('meta[name="robots"]');
    expect(robots).toHaveLength(1);
    expect(robots[0]?.getAttribute("content")).toContain("noindex");
  });

  it("UI-NF3 없는 것", () => {
    // 본문이 그려졌을 때만 「없다」가 의미가 있다.
    expect(document.querySelectorAll('[data-testid="not-found"]')).toHaveLength(1);
    expect(document.querySelectorAll("link[rel=canonical]")).toHaveLength(0);
    expect(document.querySelectorAll("link[hreflang]")).toHaveLength(0);
    expect(document.querySelectorAll('meta[property^="og:"]')).toHaveLength(0);
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0);
    expect(html).not.toContain("<script");
  });

  it("UI-NF4 제목", () => {
    const headings = document.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(en.notFoundTitle);
  });

  it("UI-NF5 홈 링크", () => {
    const home = document.querySelectorAll('[data-testid="not-found-home"]');
    expect(home).toHaveLength(1);
    expect(home[0]?.getAttribute("href")).toBe("/");
  });

  it("UI-NF6 언어 링크", () => {
    const others = languages.filter((code) => code !== defaultLanguage);
    const links = [...document.querySelectorAll('[data-testid="not-found-languages"] a')];
    expect(links).toHaveLength(others.length);
    expect(others).toEqual(["ko"]);
    const [link] = links;
    expect(link?.getAttribute("href")).toBe(pathFor("ko"));
    expect(link?.getAttribute("href")).toBe("/ko/");
    expect(link?.getAttribute("lang")).toBe("ko");
    expect(link?.getAttribute("hreflang")).toBe("ko");
    expect(link?.textContent).toBe(pages.ko.label);
    expect(link?.textContent).toBe("한국어");
  });

  it("UI-NF7 헤더에 언어 메뉴 없음, 본문 언어 링크", () => {
    const links = document.querySelectorAll('[data-testid="not-found-languages"] a');
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(document.querySelectorAll("header details")).toHaveLength(0);
    expect(document.querySelectorAll("details.lang-menu")).toHaveLength(0);
  });
});
