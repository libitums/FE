import { beforeAll, describe, expect, it } from "vitest";
import { languages, pages } from "../site";
import Manifesto from "./Manifesto.astro";
import { render, texts } from "./render.support";

describe.each(languages)("Manifesto (%s)", (language) => {
  const t = pages[language].copy;
  let document: Document;

  beforeAll(async () => {
    ({ document } = await render(Manifesto, { props: { t } }));
  });

  it("UI-MF1 뼈대 · 제목 없음", () => {
    const sections = document.querySelectorAll("section#manifesto");
    expect(sections.length).toBe(1);
    expect(sections[0]?.hasAttribute("aria-labelledby")).toBe(false);
    expect(document.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(0);
  });

  it("UI-MF2 선언문 네 줄", () => {
    const lit = document.querySelectorAll("#manifesto [data-lit]");
    expect(lit.length).toBe(4);
    expect(texts(lit)).toEqual([t.manifesto1, t.manifesto2, t.manifesto3, t.manifesto4]);
    const parents = new Set([...lit].map((node) => node.parentElement));
    expect(parents.size).toBe(1);
    expect([...parents][0]?.tagName).toBe("P");
  });

  it("UI-MF3 그림 · 링크 · 스크립트 없음", () => {
    expect(document.querySelectorAll("#manifesto").length).toBe(1);
    for (const selector of ["img", "a", "script"]) {
      expect(document.querySelectorAll(`#manifesto ${selector}`).length).toBe(0);
    }
  });
});
