import { beforeAll, describe, expect, it } from "vitest";
import Closing from "./Closing.astro";
import { render } from "./render.support";

describe("Closing", () => {
  let document: Document;

  beforeAll(async () => {
    ({ document } = await render(Closing));
  });

  it("UI-CL1 인용구", () => {
    expect(document.querySelectorAll('section[aria-labelledby="closing-quote"]').length).toBe(1);
    expect(document.querySelectorAll("blockquote").length).toBe(1);
    const quote = document.querySelectorAll('p#closing-quote[lang="ko"]');
    expect(quote.length).toBe(1);
    // 줄바꿈 태그는 글자를 내지 않으므로 textContent가 곧 `<br>`를 뺀 글자다.
    expect(quote[0]?.textContent).toBe("안녕하세요.이제, 나의 이야기가 시작된다.");
    expect(quote[0]?.querySelectorAll("br").length).toBe(1);
    expect(document.querySelector("blockquote > footer")?.textContent).toBe(
      "Hello. This is where my story begins.",
    );
  });

  it("UI-CL2 장식 그림 · 제목 없음", () => {
    const images = document.querySelectorAll("img");
    expect(images.length).toBe(1);
    expect(images[0]?.getAttribute("alt")).toBe("");
    expect(images[0]?.getAttribute("loading")).toBe("lazy");
    expect(document.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(0);
  });
});
