import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층(기기 점검 1회차, 2026-11-09): CSS **문장** 점검입니다. 레이아웃 자체(D4 · D7 · D8 · M3)는 테스트 환경이 그리지
// 못하므로 여기서 확인하는 것은 「기기에서 안 먹는 것으로 확인된 형태를 쓰지 않는다」까지고, 실제 배치는 시뮬레이터에서
// 봐야 합니다(기기 전용). 근거 문서: lynx-api-docs css/selectors.md(속성 선택자는 data-*(dataset)를 맞추지 않는 환경 ·
// 클래스 변형을 쓴다) · layout/flex-layout.md(퍼센트 flex-basis · 자동 최소 크기 없음).

const read = (relative: string): string => {
  const path = resolve(process.cwd(), relative);
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
};

const files = {
  chat: read("src/screens/messenger-chat/messenger-chat.css"),
  list: read("src/screens/messenger-chat/messenger-list.css"),
  overlays: read("src/screens/messenger-chat/chat-overlays.css"),
  shared: read("src/components/chat/chat.css"),
};

const rules = (source: string): readonly { selector: string; body: string }[] =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\s+/g, " ").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
  }));

const bodyOf = (source: string, selector: string): string =>
  rules(source)
    .filter((rule) => rule.selector === selector)
    .map((rule) => rule.body)
    .join(" ");

describe("D1. 속성 선택자 없음", () => {
  test("메신저 CSS 네 파일에 [data-…] 속성 선택자가 없다", () => {
    for (const [name, source] of Object.entries(files)) {
      expect(source, `${name} 파일을 읽었다`).not.toBe("");
      expect(source.match(/\[data-[^\]]*\]/g) ?? [], name).toEqual([]);
    }
  });

  test.each([
    ["chat", ".messenger-chat-toggle-selected"],
    ["chat", ".messenger-chat-toggle-selected .messenger-chat-toggle-label"],
    ["chat", ".messenger-chat-send-disabled"],
    ["chat", ".messenger-chat-more-open"],
    ["chat", ".messenger-chat-bulb-open"],
    ["chat", ".messenger-chat-bulb-disabled"],
    ["chat", ".messenger-chat-composer-pill-focused"],
    ["shared", ".chat-reply-option-picked"],
  ] as const)("%s CSS에 클래스 변형 %s 규칙이 있다", (name, selector) => {
    expect(bodyOf(files[name], selector), selector).not.toBe("");
  });
});

describe("D4. 잠긴 줄 아바타", () => {
  test("잠금 표지는 아바타 가운데 덮기(top: 50%)가 아니라 모서리 배지다", () => {
    const lock = bodyOf(files.list, ".messenger-list-lock");

    expect(lock).not.toBe("");
    expect(lock).not.toContain("top: 50%");
    expect(lock).toContain("position: absolute");
    expect(lock).toMatch(/bottom:/);
    expect(lock).toMatch(/right:/);
    expect(lock).toContain("background-color");
  });
});

describe("D7. 답장 보기 판", () => {
  test("보기 목록 스크롤은 퍼센트가 아닌 flex-basis 0px로 남은 높이를 받는다", () => {
    const scroll = bodyOf(files.chat, ".messenger-chat-ideas-scroll");

    expect(scroll).toContain("flex: 1 1 0px");
    expect(scroll).toContain("min-height: 0");
  });
});

describe("D8. 「…」 메뉴", () => {
  test("메뉴 상자는 자동 높이에 기대지 않고 최소 높이를 갖고, 항목은 줄어들지 않는다", () => {
    const menu = bodyOf(files.chat, ".messenger-chat-more-menu");
    const item = bodyOf(files.chat, ".messenger-chat-more-item");

    expect(menu).toMatch(/min-height:\s*\d+px/);
    expect(item).toContain("flex-shrink: 0");
  });

  // 기기 점검(사용자, 2026-11-10): 메뉴는 보이는데 항목(Report · Ask for a fix · New reply ideas)을 눌러도 열리지 않았다.
  // fixed 투명 막은 Lynx에서 문서 순서와 무관하게 위에 올라 항목 탭을 가로채고, 부모 밖으로 튀어나온(bottom: 100%)
  // 메뉴는 부모 영역 밖이라 탭이 전달되지 않을 수 있다. 막 · 메뉴 모두 대화 영역 안의 absolute로 둔다.
  test("막은 fixed가 아니고, 메뉴는 부모 밖으로 튀어나오지 않는다(bottom: 100% 없음)", () => {
    const scrim = bodyOf(files.chat, ".messenger-chat-more-scrim");
    const menu = bodyOf(files.chat, ".messenger-chat-more-menu");

    expect(scrim).toContain("position: absolute");
    expect(scrim).not.toContain("position: fixed");
    expect(menu).not.toMatch(/bottom:\s*100%/);
  });
});

describe("M3. 큰 글자에서 잘리지 않는 고정 높이", () => {
  test("안 읽은 수 알약은 height가 아니라 min-height다", () => {
    const unread = bodyOf(files.list, ".messenger-list-unread");

    expect(unread).toContain("min-height");
    expect(unread).not.toMatch(/(^|[\s;])height:/);
  });

  test("휴대폰 입력은 height가 아니라 min-height 44px다", () => {
    const input = bodyOf(files.chat, ".messenger-chat-phone-input");

    expect(input).toContain("min-height: 44px");
    expect(input).not.toMatch(/(^|[\s;])height:/);
  });

  test("글 표시는 아래 정렬이라 넘칠 때 위가 잘리고 커서 줄이 늘 보인다", () => {
    const display = bodyOf(files.chat, ".messenger-chat-display");

    expect(display).toContain("align-items: flex-end");
  });
});

describe("M2. 터치 영역", () => {
  test("「…」 · 보내기 원 크기는 그대로고 터치 확장은 hit-slop으로 한다(CSS 크기를 키우지 않는다)", () => {
    expect(bodyOf(files.chat, ".messenger-chat-more")).toContain(
      "width: var(--libitum-spacing-40)",
    );
    expect(bodyOf(files.chat, ".messenger-chat-send")).toContain(
      "width: var(--libitum-spacing-40)",
    );
  });
});
