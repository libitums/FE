import { beforeAll, describe, expect, it } from "vitest";
import { en } from "../i18n/copy";
import Hero from "./Hero.astro";
import { render } from "./render.support";

describe("Hero", () => {
  let document: Document;

  beforeAll(async () => {
    ({ document } = await render(Hero, { props: { t: en } }));
  });

  const image = (panel: number) => {
    const found = document.querySelectorAll(`[data-panel="${panel}"] img`);
    expect(found).toHaveLength(1);
    return found[0] as Element;
  };

  it("UI-HR1 첫 그림은 우선 로드", () => {
    const first = image(0);
    expect(first.getAttribute("fetchpriority")).toBe("high");
    expect(first.hasAttribute("loading")).toBe(false);
  });

  it("UI-HR2 나머지는 lazy", () => {
    for (const panel of [1, 2]) {
      const img = image(panel);
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.hasAttribute("fetchpriority")).toBe(false);
    }
  });

  it("UI-HR3 회귀: 크기 · alt · h1", () => {
    const alts = [en.scenePlaneAlt, en.scene2Alt, en.scene5Alt];
    for (const panel of [0, 1, 2]) {
      const img = image(panel);
      expect(img.getAttribute("width")).toBe("810");
      expect(img.getAttribute("height")).toBe("1440");
      // 검색 수집기가 읽는 설명은 있고, 패널 묶음이 aria-hidden이라 보조기술에는 숨는다.
      expect(img.getAttribute("alt")).toBe(alts[panel]);
      expect(img.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(document.querySelectorAll("h1#hero-title")).toHaveLength(1);
  });
});
