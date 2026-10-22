import { describe, expect, it } from "vitest";

import {
  cssDeclaration,
  cssRuleBody,
  readCssWithoutComments,
} from "../lib/wcag-contrast.test-support";

// `unit` 계층: CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.
//
// 큰 글자(accessibility-large 이상)에서 「천천히」 이름이 낱말 중간에서 줄바꿈되던 결함(BA7)을 붙잡습니다 — 이름은
// 한 줄, 토글은 글자 폭만큼, 줄은 양쪽 칸이 같은 폭을 나누되 내용 폭보다 좁아지지 않는 격자입니다.

const toggleCss = readCssWithoutComments("src/components/slow-playback-toggle.css");
const listenCss = readCssWithoutComments("src/components/listen-playback-controls.css");
const itemCss = readCssWithoutComments("src/components/item-listen-controls.css");

describe("slow-playback-toggle.css — 큰 글자 줄바꿈", () => {
  it("[BA7-1] 이름 글자는 줄을 바꾸지 않고 줄어들지 않는다", () => {
    const body = cssRuleBody(toggleCss, /\.slow-playback-toggle-label/);
    expect(cssDeclaration(body, "white-space")).toBe("nowrap");
    expect(cssDeclaration(body, "flex-shrink")).toBe("0");
  });

  it("[BA7-2] 토글은 내용 폭만큼이고 줄어들지 않는다", () => {
    const body = cssRuleBody(toggleCss, /\.slow-playback-toggle/);
    expect(cssDeclaration(body, "width")).toBe("max-content");
    expect(cssDeclaration(body, "flex-shrink")).toBe("0");
  });
});

describe("듣기 줄 · 간이 줄 — 양쪽 칸 계산", () => {
  it("[BA7-3] 듣기 3열 줄은 양쪽 칸이 같은 폭이되 내용 폭보다 좁아지지 않는 격자다", () => {
    const body = cssRuleBody(listenCss, /\.listening-prompt-controls/);
    expect(cssDeclaration(body, "display")).toBe("grid");
    expect(cssDeclaration(body, "grid-template-columns")).toBe(
      "minmax(max-content, 1fr) auto minmax(max-content, 1fr)",
    );
    expect(cssDeclaration(body, "column-gap")).toBe("var(--libitum-spacing-12)");
  });

  it("[BA7-4] 슬롯 없이 격자 칸에 바로 선 다시듣기는 재생 쪽으로 붙는다", () => {
    const body = cssRuleBody(listenCss, /\.listening-prompt-replay/);
    expect(cssDeclaration(body, "justify-self")).toBe("end");
  });

  it("[BA7-5] 간이 줄은 같은 폭이되 내용 폭보다 좁아지지 않는 두 칸 격자다", () => {
    const body = cssRuleBody(itemCss, /\.item-listen-controls/);
    expect(cssDeclaration(body, "display")).toBe("grid");
    expect(cssDeclaration(body, "grid-template-columns")).toBe(
      "minmax(max-content, 1fr) minmax(max-content, 1fr)",
    );
    expect(cssDeclaration(body, "column-gap")).toBe("var(--libitum-spacing-12)");
  });
});
