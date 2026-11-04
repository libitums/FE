import { beforeAll, describe, expect, it } from "vitest";
import { languages, pages } from "../site";
import Words from "./Words.astro";
import { plain, render } from "./render.support";

// 학습 콘텐츠(한국어 · 로마자)는 모든 언어에서 같고, 뜻풀이는 페이지 언어를 따릅니다.
const phrases = [
  { ko: "안녕하세요", roman: "annyeonghaseyo" },
  { ko: "물 주세요", roman: "mul juseyo" },
  { ko: "내일 만나요", roman: "naeil mannayo" },
];

describe.each(languages)("Words (%s)", (language) => {
  const t = pages[language].copy;
  const glosses = [t.wordHelloGloss, t.wordWaterGloss, t.wordTomorrowGloss];
  let document: Document;

  const items = () => [...document.querySelectorAll("#words li")];

  beforeAll(async () => {
    ({ document } = await render(Words, { props: { t } }));
  });

  it("UI-WD1 뼈대 · 머리", () => {
    expect(document.querySelectorAll('section#words[aria-labelledby="words-title"]').length).toBe(
      1,
    );
    const title = document.querySelectorAll("h2#words-title");
    expect(title.length).toBe(1);
    expect(title[0]?.textContent).toBe(plain(t.wordsTitle));
    expect(document.querySelector("#words .eyebrow")?.textContent).toBe(t.wordsEyebrow);
  });

  it("UI-WD2 표현 셋", () => {
    const found = items();
    expect(found.length).toBe(3);
    found.forEach((li, index) => {
      const expected = phrases[index];
      const img = li.querySelectorAll('img[aria-hidden="true"][loading="lazy"]');
      expect(img.length).toBe(1);
      expect(img[0]?.getAttribute("alt")).toBe(
        [t.wordHelloAlt, t.wordWaterAlt, t.wordTomorrowAlt][index],
      );
      const ko = li.querySelectorAll('[lang="ko"]');
      expect(ko.length).toBe(1);
      expect(ko[0]?.textContent?.trim()).toBe(expected?.ko);
      expect(li.textContent).toContain(expected?.roman);
      expect(li.textContent).toContain(glosses[index]);
    });
  });

  it("UI-WD3 학습 콘텐츠는 언어와 무관 · 뜻풀이는 페이지 언어 · 소제목 없음", () => {
    const found = items();
    expect(found.length).toBe(3);
    expect(found.map((li) => li.querySelector('[lang="ko"]')?.textContent?.trim())).toEqual(
      phrases.map((phrase) => phrase.ko),
    );
    found.forEach((li, index) => {
      expect(li.textContent).toContain(phrases[index]?.roman);
      expect(li.textContent).toContain(glosses[index]);
      // 뜻풀이 안에 한글이 없다 — 한국어 표현은 lang=ko 요소 하나뿐이다.
      expect(li.querySelector(".word__gloss")?.textContent).not.toMatch(/[가-힣]/);
    });
    expect(document.querySelectorAll("#words h3, #words h4, #words h5, #words h6").length).toBe(0);
  });
});
