import { beforeAll, describe, expect, it } from "vitest";
import type { Copy } from "../i18n/copy";
import { languages, pages } from "../site";
import Journey from "./Journey.astro";
import { plain, render } from "./render.support";

describe.each(languages)("Journey (%s)", (language) => {
  const t = pages[language].copy;
  let document: Document;

  const scene = (n: number) => ({
    alt: t[`scene${n}Alt` as keyof Copy],
    title: t[`scene${n}Title` as keyof Copy],
    desc: t[`scene${n}Desc` as keyof Copy],
  });
  const items = () => [...document.querySelectorAll("#journey-rail > li")];

  beforeAll(async () => {
    ({ document } = await render(Journey, { props: { t } }));
  });

  it("UI-JN1 뼈대 · 머리", () => {
    const sections = document.querySelectorAll('section#journey[aria-labelledby="journey-title"]');
    expect(sections.length).toBe(1);
    expect(document.querySelector("h2#journey-title")?.textContent).toBe(plain(t.journeyTitle));
    expect(document.querySelector("#journey .eyebrow")?.textContent).toBe(t.journeyEyebrow);
    expect(sections[0]?.textContent).toContain(t.journeyLead);
  });

  it("UI-JN2 장면 줄은 포커스되는 목록", () => {
    const rails = document.querySelectorAll(
      'ol#journey-rail[tabindex="0"][aria-labelledby="journey-title"]',
    );
    expect(rails.length).toBe(1);
    expect(rails[0]?.tagName).toBe("OL");
  });

  it("UI-JN3 장면 여섯", () => {
    const found = items();
    expect(found.length).toBe(6);
    for (let i = 0; i < 5; i += 1) {
      const li = found[i] as Element;
      const expected = scene(i + 1);
      const images = li.querySelectorAll("img");
      expect(images.length).toBe(1);
      expect(images[0]?.getAttribute("alt")).toBe(expected.alt);
      expect(li.querySelector("h3")?.textContent).toBe(expected.title);
      const paragraphs = li.querySelectorAll("p");
      expect(paragraphs[0]?.textContent).toBe(`0${i + 1}`);
      expect(paragraphs[1]?.textContent).toBe(expected.desc);
    }
    const more = found[5] as Element;
    expect(more.querySelectorAll("img").length).toBe(0);
    expect(more.querySelector("h3")?.textContent).toBe(t.moreTitle);
    expect(more.querySelector("p")?.textContent).toBe(t.moreDesc);
  });

  it("UI-JN4 이전 · 다음 버튼", () => {
    const prev = document.querySelectorAll('button[type="button"][data-rail="-1"]');
    const next = document.querySelectorAll('button[type="button"][data-rail="1"]');
    expect(prev.length).toBe(1);
    expect(next.length).toBe(1);
    expect(prev[0]?.getAttribute("aria-label")).toBe(t.railPrev);
    expect(next[0]?.getAttribute("aria-label")).toBe(t.railNext);
    for (const button of [prev[0], next[0]]) {
      expect(button?.querySelectorAll('svg[aria-hidden="true"]').length).toBe(1);
    }
  });

  it("UI-JN5 그림은 lazy · 반응형 srcset", () => {
    const images = [...document.querySelectorAll("#journey-rail img")];
    expect(images.length).toBe(5);
    for (const image of images) {
      expect(image.getAttribute("loading")).toBe("lazy");
      const srcset = image.getAttribute("srcset") ?? "";
      expect(srcset.split(",").length).toBe(3);
      expect(srcset).toContain("320w");
      expect(srcset).toContain("480w");
      expect(image.getAttribute("sizes") ?? "").toContain("72vw");
    }
  });
});
