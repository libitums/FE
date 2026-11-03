import { beforeAll, describe, expect, it } from "vitest";
import { languages, pages } from "../site";
import { storyEpisodes } from "../story/episodes";
import Journey from "./Journey.astro";
import { plain, render } from "./render.support";

describe.each(languages)("Journey (%s)", (language) => {
  const t = pages[language].copy;
  let document: Document;

  const items = () => [...document.querySelectorAll("#journey-rail > li")];
  const two = (n: number) => String(n).padStart(2, "0");

  beforeAll(async () => {
    ({ document } = await render(Journey, { props: { language, t } }));
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

  it("UI-JN3 에피소드 카드는 데이터 순서(새 것 먼저) 그대로, 끝에 '더 이어진다' 자리", () => {
    const found = items();
    expect(found.length).toBe(storyEpisodes.length + 1);
    storyEpisodes.forEach((episode, i) => {
      const li = found[i] as Element;
      expect(li.getAttribute("data-episode")).toBe(episode.id);
      const images = li.querySelectorAll("img");
      expect(images.length).toBe(1);
      expect(images[0]?.getAttribute("alt")).toBe(episode.alt[language]);
      expect(li.querySelector(".scene__no")?.textContent).toContain(two(episode.number));
    });
    const more = found[storyEpisodes.length] as Element;
    expect(more.querySelectorAll("img").length).toBe(0);
    expect(more.querySelector("h3")?.textContent).toBe(t.moreTitle);
    expect(more.querySelector("p")?.textContent).toBe(t.moreDesc);
  });

  it("UI-JN3a 카드에 보이는 글은 번호뿐 — 때 · 제목 · 티저는 단추가 여는 숨김 층에", () => {
    storyEpisodes.forEach((episode, i) => {
      const li = items()[i] as Element;
      const buttons = li.querySelectorAll(
        'button[type="button"].scene__peek[aria-expanded="false"]',
      );
      expect(buttons.length).toBe(1);
      const button = buttons[0] as Element;
      // 단추 안에는 그림과 번호만 — 제목 · 티저는 단추 밖(숨김 층)에 있다.
      expect(button.querySelectorAll("img").length).toBe(1);
      expect(button.querySelector(".scene__no")).not.toBeNull();
      expect(button.textContent).not.toContain(episode.title[language]);
      expect(button.textContent).not.toContain(episode.teaser[language]);
      const revealId = button.getAttribute("aria-controls") ?? "";
      expect(revealId).toBe(`${episode.id}-peek`);
      const reveal = li.querySelector(".scene__reveal");
      expect(reveal?.getAttribute("id")).toBe(revealId);
      expect(reveal?.querySelector(".scene__when")?.textContent).toBe(episode.when[language]);
      expect(reveal?.querySelector("h3")?.textContent).toBe(episode.title[language]);
      expect(reveal?.querySelector(".scene__desc")?.textContent).toBe(episode.teaser[language]);
    });
  });

  it("UI-JN3b New 표는 맨 앞 카드 하나에만", () => {
    const chips = [...document.querySelectorAll("#journey-rail .scene__new")];
    expect(chips.length).toBe(1);
    expect(chips[0]?.textContent).toBe(t.journeyNew);
    expect(chips[0]?.closest("li")).toBe(items()[0]);
    expect(items()[0]?.classList.contains("scene--new")).toBe(true);
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
    expect(images.length).toBe(storyEpisodes.length);
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
