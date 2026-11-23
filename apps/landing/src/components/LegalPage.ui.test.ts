import { beforeAll, describe, expect, it } from "vitest";
import { legalDocument } from "../legal/documents";
import type { LegalDocumentId, LegalLanguage } from "../legal/legal.contract";
import { legalDocumentIds, legalLanguages, legalPathFor } from "../legal/legal-paths";
import { pages } from "../site";
import LegalPage from "./LegalPage.astro";
import { render, texts } from "./render.support";

const cases: [LegalDocumentId, LegalLanguage][] = legalDocumentIds.flatMap((id) =>
  legalLanguages.map((language): [LegalDocumentId, LegalLanguage] => [id, language]),
);

describe.each(cases)("LegalPage (%s · %s)", (id, language) => {
  const source = legalDocument(id, language);
  let document: Document;
  let withSite: Document;

  beforeAll(async () => {
    ({ document } = await render(LegalPage, { props: { id, language } }));
    ({ document: withSite } = await render(LegalPage, {
      props: { id, language },
      site: "https://example.test",
    }));
  });

  it("UI-LG1 문서 — 언어 · 제목 · 설명 · 색인", () => {
    expect(document.documentElement.getAttribute("lang")).toBe(language);
    expect(document.title).toBe(`${source.title} — Duru`);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      source.description,
    );
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
    expect(robots).toContain("index");
    expect(robots).not.toContain("noindex");
  });

  it("UI-LG2 제목 하나 · 절 제목은 데이터 순서 그대로", () => {
    const main = document.querySelectorAll('[data-testid="legal"]');
    expect(main).toHaveLength(1);
    expect(main[0]?.getAttribute("data-legal-document")).toBe(id);
    expect(texts(document.querySelectorAll("h1"))).toEqual([source.title]);
    expect(texts(document.querySelectorAll("main h2"))).toEqual(
      source.sections.map((section) => section.heading),
    );
  });

  it("UI-LG3 시행일 — 보이는 글과 기계가 읽는 값", () => {
    const effective = document.querySelector('[data-testid="legal-effective"]');
    expect(effective?.textContent).toContain(source.effectiveLabel);
    const time = effective?.querySelector("time");
    expect(time?.textContent).toBe(source.effectiveDate);
    expect(time?.getAttribute("datetime")).toBe(source.effectiveIso);
  });

  it("UI-LG4 번역 안내는 번역본에만", () => {
    const note = document.querySelectorAll('[data-testid="legal-translation-note"]');
    expect(note).toHaveLength(source.translationNote === "" ? 0 : 1);
    if (source.translationNote !== "")
      expect(note[0]?.textContent?.trim()).toBe(source.translationNote);
  });

  it("UI-LG5 언어판 링크 — 지금 언어에 aria-current", () => {
    const links = [...document.querySelectorAll('[data-testid="legal-languages"] a')];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      legalLanguages.map((code) => legalPathFor(id, code)),
    );
    expect(texts(links).map((label) => label.trim())).toEqual(
      legalLanguages.map((code) => pages[code].label),
    );
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual(
      legalLanguages.map((code) => (code === language ? "page" : null)),
    );
  });

  it("UI-LG6 다른 문서로 가는 링크는 같은 언어판", () => {
    const links = [...document.querySelectorAll('[data-testid="legal-siblings"] a')];
    const others = legalDocumentIds.filter((other) => other !== id);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      others.map((other) => legalPathFor(other, language)),
    );
    expect(texts(links)).toEqual(others.map((other) => legalDocument(other, language).title));
  });

  it("UI-LG7 표 — 머리 칸 · 행 머리 · 이름 붙은 스크롤 영역", () => {
    const tables = source.sections
      .flatMap((section) => section.blocks)
      .filter((block) => block.kind === "table");
    const rendered = [...document.querySelectorAll("main table")];
    expect(rendered).toHaveLength(tables.length);
    rendered.forEach((table, index) => {
      const data = tables[index];
      if (data === undefined || data.kind !== "table") throw new Error("표 데이터가 없다");
      expect(texts(table.querySelectorAll('thead th[scope="col"]'))).toEqual([...data.head]);
      expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(data.rows.length);
      expect(table.querySelector("caption")?.textContent).toBe(data.caption);
      const region = table.parentElement;
      expect(region?.getAttribute("role")).toBe("region");
      expect(region?.getAttribute("aria-label")).toBe(data.caption);
      expect(region?.getAttribute("tabindex")).toBe("0");
    });
  });

  it("UI-LG8 본문 링크 — 바깥 주소에만 rel, 새 창으로 열지 않는다", () => {
    const links = [...document.querySelectorAll("main .legal__section a")];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^(https:\/\/|mailto:|\/)/);
      expect(link.getAttribute("target")).toBeNull();
      expect(link.getAttribute("rel")).toBe(
        href.startsWith("https://") ? "noopener noreferrer" : null,
      );
    }
  });

  it("UI-LG9 배포 주소가 없으면 canonical · hreflang이 없다", () => {
    expect(document.querySelectorAll("link[rel=canonical]")).toHaveLength(0);
    expect(document.querySelectorAll("link[rel=alternate][hreflang]")).toHaveLength(0);
  });

  it("UI-LG10 배포 주소가 있으면 canonical은 자기 주소, hreflang은 언어판 + x-default", () => {
    const origin = "https://example.test";
    expect(withSite.querySelector("link[rel=canonical]")?.getAttribute("href")).toBe(
      origin + legalPathFor(id, language),
    );
    const alternates = [...withSite.querySelectorAll("link[rel=alternate][hreflang]")].map(
      (link) => [link.getAttribute("hreflang"), link.getAttribute("href")],
    );
    expect(alternates).toEqual([
      ...legalLanguages.map((code) => [code, origin + legalPathFor(id, code)]),
      ["x-default", origin + legalPathFor(id, "en")],
    ]);
  });

  it("UI-LG11 머리 · 꼬리는 페이지용 — 홈으로 가는 로고, 스크립트 없음", () => {
    expect(document.querySelector('[data-testid="header-brand"]')?.getAttribute("href")).toBe(
      language === "en" ? "/" : `/${language}/`,
    );
    expect(document.querySelectorAll("footer")).toHaveLength(1);
    expect(document.querySelectorAll("script")).toHaveLength(0);
  });
});
