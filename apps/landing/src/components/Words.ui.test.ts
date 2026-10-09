import { beforeAll, describe, expect, it } from "vitest";
import { languages, pages } from "../site";
import Words from "./Words.astro";
import { plain, render } from "./render.support";

// 학습 콘텐츠는 두 언어에서 같습니다.
const phrases = [
  { ko: "안녕하세요", roman: "annyeonghaseyo", gloss: "Hello" },
  { ko: "물 주세요", roman: "mul juseyo", gloss: "Water, please" },
  { ko: "내일 만나요", roman: "naeil mannayo", gloss: "See you tomorrow" },
];

describe.each(languages)("Words (%s)", (language) => {
  const t = pages[language].copy;
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
      expect(li.querySelectorAll('img[alt=""][loading="lazy"]').length).toBe(1);
      const ko = li.querySelectorAll('[lang="ko"]');
      expect(ko.length).toBe(1);
      expect(ko[0]?.textContent?.trim()).toBe(expected?.ko);
      expect(li.textContent).toContain(expected?.roman);
      expect(li.textContent).toContain(expected?.gloss);
    });
  });

  it("UI-WD3 학습 콘텐츠는 언어와 무관 · 소제목 없음", () => {
    const found = items();
    expect(found.length).toBe(3);
    expect(found.map((li) => li.querySelector('[lang="ko"]')?.textContent?.trim())).toEqual(
      phrases.map((phrase) => phrase.ko),
    );
    found.forEach((li, index) => {
      expect(li.textContent).toContain(phrases[index]?.roman);
      expect(li.textContent).toContain(phrases[index]?.gloss);
    });
    expect(document.querySelectorAll("#words h3, #words h4, #words h5, #words h6").length).toBe(0);
  });
});
