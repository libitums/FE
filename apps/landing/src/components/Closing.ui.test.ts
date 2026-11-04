import { beforeAll, describe, expect, it } from "vitest";
import { languages, pages } from "../site";
import Closing from "./Closing.astro";
import { render } from "./render.support";

describe.each(languages)("Closing (%s)", (language) => {
  const t = pages[language].copy;
  let document: Document;

  beforeAll(async () => {
    ({ document } = await render(Closing, { props: { t } }));
  });

  it("UI-CL1 인용구", () => {
    expect(document.querySelectorAll('section[aria-labelledby="closing-quote"]').length).toBe(1);
    expect(document.querySelectorAll("blockquote").length).toBe(1);
    const quote = document.querySelectorAll('p#closing-quote[lang="ko"]');
    expect(quote.length).toBe(1);
    // 줄바꿈 태그는 글자를 내지 않으므로 textContent가 곧 `<br>`를 뺀 글자다.
    expect(quote[0]?.textContent).toBe("안녕하세요.이제, 나의 이야기가 시작된다.");
    expect(quote[0]?.querySelectorAll("br").length).toBe(1);
    // 뜻풀이는 페이지 언어를 따른다(ko는 앱이 보여 주는 영어 그대로).
    expect(document.querySelector("blockquote > footer")?.textContent).toBe(t.closingGloss);
    expect(document.querySelector("blockquote > footer")?.textContent).not.toMatch(/[가-힣]/);
  });

  it("UI-CL2 장식 그림 · 제목 없음", () => {
    const images = document.querySelectorAll("img");
    expect(images.length).toBe(1);
    expect(images[0]?.getAttribute("alt")).toBe(t.closingDescentAlt);
    expect(images[0]?.getAttribute("aria-hidden")).toBe("true");
    expect(images[0]?.getAttribute("loading")).toBe("lazy");
    expect(document.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(0);
  });
});
