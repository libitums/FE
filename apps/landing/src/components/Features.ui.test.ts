import { beforeAll, describe, expect, it } from "vitest";
import { languages, pages } from "../site";
import Features from "./Features.astro";
import { plain, render, texts } from "./render.support";

describe.each(languages)("Features (%s)", (language) => {
  const t = pages[language].copy;
  let document: Document;

  const features = () => [...document.querySelectorAll('[data-testid="feature"]')];

  beforeAll(async () => {
    ({ document } = await render(Features, { props: { t } }));
  });

  it("UI-FT1 뼈대 · 머리", () => {
    expect(document.querySelectorAll('section#ways[aria-labelledby="features-title"]').length).toBe(
      1,
    );
    const title = document.querySelectorAll("h2#features-title");
    expect(title.length).toBe(1);
    expect(title[0]?.textContent).toBe(plain(t.waysTitle));
    expect(document.querySelector("#ways .eyebrow")?.textContent).toBe(t.waysEyebrow);
  });

  it("UI-FT2 기능 넷 · 제목 · 설명", () => {
    const found = features();
    expect(found.length).toBe(4);
    const expected = [
      [t.wayStoryTitle, t.wayStoryDesc],
      [t.wayMessengerTitle, t.wayMessengerDesc],
      [t.wayCallTitle, t.wayCallDesc],
      [t.wayPracticeTitle, t.wayPracticeDesc],
    ];
    found.forEach((node, index) => {
      const h3 = node.querySelectorAll("h3");
      expect(h3.length).toBe(1);
      expect(h3[0]?.textContent).toBe(expected[index]?.[0]);
      const next = h3[0]?.nextElementSibling;
      expect(next?.tagName).toBe("P");
      expect(next?.textContent).toBe(expected[index]?.[1]);
    });
  });

  it("UI-FT3 단계 표시", () => {
    const steps = document.querySelectorAll('[data-testid="feature-step"]');
    expect(steps.length).toBe(4);
    expect(texts(steps)).toEqual(["01 / 04", "02 / 04", "03 / 04", "04 / 04"]);
    const found = features();
    expect(found.length).toBe(4);
    for (const node of found) {
      expect(node.querySelectorAll('[data-testid="feature-step"]').length).toBe(1);
    }
  });

  it("UI-FT4 휴대폰 넷 · 한국어 화면", () => {
    expect(document.querySelectorAll('[data-testid="feature-phone"]').length).toBe(4);
    const found = features();
    expect(found.length).toBe(4);
    for (const node of found) {
      const phones = node.querySelectorAll('[data-testid="feature-phone"]');
      expect(phones.length).toBe(1);
      expect(phones[0]?.querySelectorAll('[lang="ko"]').length).toBeGreaterThanOrEqual(1);
    }
  });

  it("UI-FT5 장식 그림", () => {
    const images = [...document.querySelectorAll("#ways img")];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.getAttribute("alt")).toBe("");
      expect(image.getAttribute("loading")).toBe("lazy");
    }
  });

  it("UI-FT6 제목 단계", () => {
    expect(document.querySelectorAll("#ways h1").length).toBe(0);
    expect(document.querySelectorAll("#ways h2").length).toBe(1);
    expect(document.querySelectorAll("#ways h3").length).toBe(4);
    expect(document.querySelectorAll("#ways h4, #ways h5, #ways h6").length).toBe(0);
  });
});
