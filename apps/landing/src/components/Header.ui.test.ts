import { beforeAll, describe, expect, it } from "vitest";
import { languages, pages, pathFor } from "../site";
import Header from "./Header.astro";
import { render } from "./render.support";

describe.each(languages)("Header (%s)", (language) => {
  const t = pages[language].copy;
  let document: Document;
  let pageDocument: Document;

  beforeAll(async () => {
    ({ document } = await render(Header, { props: { language, t } }));
    ({ document: pageDocument } = await render(Header, {
      props: { language, t, variant: "page" },
    }));
  });

  it("UI-HD1 머리 뼈대 · 로고", () => {
    expect(document.querySelectorAll("header#site-header").length).toBe(1);
    const brand = document.querySelectorAll('[data-testid="header-brand"]');
    expect(brand.length).toBe(1);
    expect(brand[0]?.getAttribute("href")).toBe("#top");
    expect(brand[0]?.querySelectorAll('img[alt="Duru"]').length).toBe(1);
  });

  it("UI-HD2 섹션 메뉴", () => {
    const navs = document.querySelectorAll("nav[aria-label]");
    expect(navs.length).toBe(1);
    expect(navs[0]?.getAttribute("aria-label")).toBe(t.navLabel);
    const links = [...(navs[0]?.querySelectorAll("a") ?? [])];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "#ways",
      "#journey",
      "#words",
      "#faq",
    ]);
    expect(links.map((a) => a.textContent)).toEqual([
      t.navWays,
      t.navJourney,
      t.navWords,
      t.navFaq,
    ]);
  });

  it("UI-HD3 언어 메뉴", () => {
    const menus = document.querySelectorAll("#site-header details");
    expect(menus.length).toBe(1);
    const summary = menus[0]?.querySelector("summary[aria-label]");
    expect(summary?.getAttribute("aria-label")).toBe(
      `${t.languageLabel}: ${pages[language].label}`,
    );
    const links = [...document.querySelectorAll("details ul li a")];
    expect(links.length).toBe(languages.length);
    languages.forEach((code, index) => {
      const link = links[index];
      expect(link?.getAttribute("href")).toBe(pathFor(code));
      expect(link?.getAttribute("lang")).toBe(code);
      expect(link?.getAttribute("hreflang")).toBe(code);
      expect(link?.textContent?.trim()).toBe(pages[code].label);
    });
    const current = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.length).toBe(1);
    expect(current[0]?.getAttribute("hreflang")).toBe(language);
    expect(links.filter((link) => link.hasAttribute("aria-current")).length).toBe(1);
  });

  it("UI-HD4 받기 버튼", () => {
    const cta = document.querySelectorAll('[data-testid="header-cta"]');
    expect(cta.length).toBe(1);
    expect(cta[0]?.getAttribute("href")).toBe("#download");
    expect(cta[0]?.textContent).toBe(t.navCta);
  });

  it("UI-HD5 page variant", () => {
    const home = pathFor(language);
    expect(pageDocument.querySelector('[data-testid="header-brand"]')?.getAttribute("href")).toBe(
      home,
    );
    expect(pageDocument.querySelectorAll("nav").length).toBe(0);
    expect(pageDocument.querySelectorAll("details").length).toBe(0);
    expect(pageDocument.querySelector('[data-testid="header-cta"]')?.getAttribute("href")).toBe(
      `${home}#download`,
    );
    expect(pageDocument.querySelector("#site-header")?.classList.contains("is-solid")).toBe(true);
    expect(document.querySelector("#site-header")?.classList.contains("is-solid")).toBe(false);
  });

  it("UI-HD6 제목 없음 · 장식 아이콘", () => {
    expect(document.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(0);
    expect(document.querySelectorAll('summary svg[aria-hidden="true"]').length).toBe(2);
  });
});
