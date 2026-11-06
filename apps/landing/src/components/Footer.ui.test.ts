import { beforeAll, describe, expect, it } from "vitest";
import { brandProfiles, languages, pages, pathFor } from "../site";
import Footer from "./Footer.astro";
import { render } from "./render.support";

describe.each(languages)("Footer (%s)", (language) => {
  const t = pages[language].copy;
  let document: Document;
  let pageDocument: Document;

  beforeAll(async () => {
    ({ document } = await render(Footer, { props: { language, t } }));
    ({ document: pageDocument } = await render(Footer, {
      props: { language, t, variant: "page" },
    }));
  });

  it("UI-FO1 로고 링크", () => {
    expect(document.querySelectorAll("footer").length).toBe(1);
    const brand = document.querySelectorAll('[data-testid="footer-brand"]');
    expect(brand.length).toBe(1);
    expect(brand[0]?.querySelectorAll('img[alt="Duru"]').length).toBe(1);
    expect(brand[0]?.getAttribute("href")).toBe("#top");
    expect(pageDocument.querySelector('[data-testid="footer-brand"]')?.getAttribute("href")).toBe(
      pathFor(language),
    );
  });

  it("UI-FO2 약관 · 개인정보 링크", () => {
    const links = [
      ...document.querySelectorAll('footer ul:not([data-testid="footer-social"]) li a'),
    ];
    expect(links.length).toBe(2);
    expect(links.map((a) => a.textContent)).toEqual([t.footerTerms, t.footerPrivacy]);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      const rel = link.getAttribute("rel") ?? "";
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });

  it("UI-FO4 공식 프로필 링크 — 이름 그대로 · 새 창 · rel에 me", () => {
    const links = [...document.querySelectorAll('[data-testid="footer-social"] li a')];
    expect(links.length).toBe(brandProfiles.length);
    expect(links.length).toBeGreaterThan(0);
    expect(links.map((a) => a.textContent?.trim())).toEqual(brandProfiles.map((p) => p.name));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(brandProfiles.map((p) => p.url));
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      const rel = (link.getAttribute("rel") ?? "").split(/\s+/);
      expect(rel).toContain("me");
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    }
  });

  it("UI-FO3 저작권 · 제목 없음", () => {
    expect(document.querySelector("footer")?.textContent).toContain("© 2026 Duru");
    expect(document.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(0);
  });
});
