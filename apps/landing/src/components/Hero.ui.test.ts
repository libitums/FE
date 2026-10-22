import { beforeAll, describe, expect, it } from "vitest";
import { en } from "../i18n/copy";
import { ko } from "../i18n/ko";
import Hero from "./Hero.astro";
import { render } from "./render.support";

describe("Hero", () => {
  let document: Document;

  beforeAll(async () => {
    ({ document } = await render(Hero, { props: { language: "en", t: en } }));
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

  it("UT13 체험판 링크(en) — /try/ · data-trial-link=hero · trialCta", () => {
    const links = document.querySelectorAll('[data-testid="hero-trial-link"]');
    expect(links).toHaveLength(1);
    const link = links[0] as Element;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/try/");
    expect(link.getAttribute("data-trial-link")).toBe("hero");
    expect(en.trialCta).toBeTruthy();
    expect(link.textContent?.trim()).toBe(en.trialCta);
    // 보조기술에 숨은 패널 묶음 밖에 있다.
    expect(link.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("UT13 체험판 링크(ko) — /ko/try/", async () => {
    const { document: korean } = await render(Hero, { props: { language: "ko", t: ko } });
    const link = korean.querySelector('[data-testid="hero-trial-link"]');
    expect(link?.getAttribute("href")).toBe("/ko/try/");
    expect(link?.getAttribute("data-trial-link")).toBe("hero");
    expect(ko.trialCta).toBeTruthy();
    expect(link?.textContent?.trim()).toBe(ko.trialCta);
  });
});
