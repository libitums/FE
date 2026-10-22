import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { opacity } from "@libitums/design-tokens";
import { describe, expect, it } from "vitest";

import {
  findRoleplaySection,
  hasRoleplayCardPressedShade,
  premiumRoleplayAccessibilityLabel,
  premiumRoleplayLock,
  premiumRoleplayNotice,
  roleplayCardClassName,
  roleplayFormLabel,
  roleplayItemAccessibilityLabel,
  roleplaySectionAccessibilityLabel,
} from "./roleplay-list";
import type { PremiumRoleplayItem, RoleplayItem, RoleplaySection } from "./roleplay-list.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";

// 항목 fixture는 이 파일 안에서 짓습니다 — 롤플레이 항목은 본편 에피소드의 이야기 롤플레이 하나입니다.
const storyItem: RoleplayItem = {
  form: "story",
  unitId: "story-u01-water",
  episodeId: "u01-water",
  title: "Water",
  lineCount: 6,
  imageUrl: null,
};

describe("roleplayFormLabel", () => {
  it("R4. 형태를 낱말로 사상한다", () => {
    expect(roleplayFormLabel("story", uiCopyEn)).toBe("Roleplay");
  });
});

describe("roleplayItemAccessibilityLabel", () => {
  it("R5. `${title}, ${formLabel} · ${대사 수}`이고 완료됨·잠김을 포함하지 않는다", () => {
    const label = roleplayItemAccessibilityLabel(storyItem, false, uiCopyEn);

    expect(label).toBe("Water, Roleplay · 6 lines");
    expect(label).not.toContain("completed");
    expect(label).not.toContain("locked");
  });

  // R6 — roleplayItemAccessibilityLabel 몫입니다.
  it("R6. 같은 항목을 두 번 불러도 같은 값이다", () => {
    expect(roleplayItemAccessibilityLabel(storyItem, false, uiCopyEn)).toBe(
      roleplayItemAccessibilityLabel(storyItem, false, uiCopyEn),
    );
  });
});

describe("roleplayItemAccessibilityLabel — 잠김", () => {
  it("R7. 잠긴 항목은 이름 뒤에 잠김이 붙는다", () => {
    expect(roleplayItemAccessibilityLabel(storyItem, true, uiCopyEn)).toBe(
      "Water, Roleplay · 6 lines, locked",
    );
  });
});

const openSection: RoleplaySection = {
  episodeId: "tutorial",
  label: "Episode 0.",
  title: "Tutorial.",
  unlocked: true,
  items: [],
  premiumItems: [],
};
// 「구획이 여럿일 때 id로 고른다」를 보려는 둘째 구획입니다.
const lockedSection: RoleplaySection = {
  ...openSection,
  episodeId: "cafe",
  unlocked: false,
};

describe("findRoleplaySection", () => {
  it("F1. 그 id의 구획을 돌려준다", () => {
    expect(findRoleplaySection([openSection, lockedSection], "cafe")).toBe(lockedSection);
  });

  // 이 함수는 목록에서 찾는 총함수라 없는 id가 와도 던지지 않아야 하고, 그것을 보는 케이스가 이것입니다.
  it("F2. 없는 id면 undefined다", () => {
    expect(findRoleplaySection([openSection], "unknown")).toBeUndefined();
  });
});

describe("roleplaySectionAccessibilityLabel", () => {
  it("A1. 열린 구획은 두 줄을 이어 읽는다", () => {
    expect(roleplaySectionAccessibilityLabel(openSection, uiCopyEn)).toBe("Episode 0. Tutorial.");
  });

  it("A2. 잠긴 구획은 잠김과 여는 조건까지 말한다", () => {
    expect(roleplaySectionAccessibilityLabel(lockedSection, uiCopyEn)).toBe(
      "Episode 0. Tutorial., locked, finish this episode in your journey to unlock it",
    );
  });
});

const wrongOrder: PremiumRoleplayItem = {
  id: "premium-wrong-order",
  title: "주문이 잘못 나왔어요",
  situation: "카페 직원에게 정중하게 말하기",
};

describe("premiumRoleplayLock", () => {
  it("L1. 에피소드를 끝내지 않았으면 에피소드 잠김이다", () => {
    expect(premiumRoleplayLock(lockedSection)).toBe("episode");
  });

  it("L2. 에피소드를 끝냈으면 결제 잠김이다", () => {
    expect(premiumRoleplayLock(openSection)).toBe("payment");
  });
});

describe("premiumRoleplayAccessibilityLabel", () => {
  it("A3. 에피소드 잠김은 잠김으로 읽는다", () => {
    expect(premiumRoleplayAccessibilityLabel(wrongOrder, "episode", uiCopyEn)).toBe(
      "주문이 잘못 나왔어요, 카페 직원에게 정중하게 말하기, locked",
    );
  });

  it("A4. 결제 잠김은 잠김이 아니라 플러스 전용으로 읽는다 — 여는 방법이 다르다", () => {
    expect(premiumRoleplayAccessibilityLabel(wrongOrder, "payment", uiCopyEn)).toBe(
      "주문이 잘못 나왔어요, 카페 직원에게 정중하게 말하기, Plus only",
    );
  });
});

describe("premiumRoleplayNotice", () => {
  it("N1. 누른 항목의 제목을 싣고 준비 중임을 말한다", () => {
    expect(premiumRoleplayNotice(wrongOrder, uiCopyEn)).toBe(
      "“주문이 잘못 나왔어요” is a Plus roleplay. Plus isn't available yet.",
    );
  });
});

describe("roleplayCardClassName", () => {
  it("U-R6. 열린 카드가 reduced이면 클래스 끝에 motion-reduced가 붙는다", () => {
    expect(roleplayCardClassName({ layout: "row", locked: false, motion: "reduced" })).toBe(
      "roleplay-card roleplay-card-row roleplay-card-motion-reduced",
    );
  });

  it("U-R8. 잠긴 카드는 locked가 motion-reduced보다 앞이고 standard에서도 locked가 붙는다", () => {
    expect(roleplayCardClassName({ layout: "list", locked: true, motion: "reduced" })).toBe(
      "roleplay-card roleplay-card-list roleplay-card-locked roleplay-card-motion-reduced",
    );
    expect(roleplayCardClassName({ layout: "list", locked: true, motion: "standard" })).toBe(
      "roleplay-card roleplay-card-list roleplay-card-locked",
    );
  });

  it("U-R9. 열린 standard 카드는 기존 클래스 그대로다", () => {
    expect(roleplayCardClassName({ layout: "row", locked: false, motion: "standard" })).toBe(
      "roleplay-card roleplay-card-row",
    );
    expect(roleplayCardClassName({ layout: "list", locked: false, motion: "standard" })).toBe(
      "roleplay-card roleplay-card-list",
    );
  });
});

describe("hasRoleplayCardPressedShade", () => {
  it("U-R7. reduced이고 열린 카드만 막을 그린다", () => {
    expect(hasRoleplayCardPressedShade(false, "reduced")).toBe(true);
    expect(hasRoleplayCardPressedShade(true, "reduced")).toBe(false);
    expect(hasRoleplayCardPressedShade(false, "standard")).toBe(false);
    expect(hasRoleplayCardPressedShade(true, "standard")).toBe(false);
  });
});

// CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.
describe("roleplay-card.css", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/screens/roleplay-list/roleplay-card.css"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  /** 선택자 정규식에 맞는 첫 규칙의 본문. 규칙이 없으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
  const ruleBody = (selector: RegExp): string =>
    new RegExp(`(?:^|\\})\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";

  const pressedShadeRule =
    /\.roleplay-card-motion-reduced:not\(\.roleplay-card-locked\):active\s+\.roleplay-card-pressed-shade/;

  it("U-R1. 열린 카드 눌림은 pressed 토큰 scale이다", () => {
    expect(ruleBody(/\.roleplay-card:not\(\.roleplay-card-locked\):active/)).toMatch(
      /transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/,
    );
  });

  it("U-R2. base에 transform 전환이 있고 기존 position · overflow를 유지한다", () => {
    const body = ruleBody(/\.roleplay-card/);
    expect(body).toMatch(
      /transition:\s*transform var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
    );
    expect(body).toMatch(/position:\s*relative/);
    expect(body).toMatch(/overflow:\s*hidden/);
  });

  it("U-R3. reduced 열린 카드 눌림은 transform: none이다", () => {
    expect(ruleBody(/\.roleplay-card-motion-reduced:not\(\.roleplay-card-locked\):active/)).toMatch(
      /transform:\s*none/,
    );
  });

  it("U-R4. 눌림 막은 흰 막이고 reduced 눌림에서 pressed-shade 토큰 불투명도다", () => {
    const body = ruleBody(/\.roleplay-card-pressed-shade/);
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/top:\s*0\b/);
    expect(body).toMatch(/left:\s*0\b/);
    expect(body).toMatch(/width:\s*100%/);
    expect(body).toMatch(/height:\s*100%/);
    expect(body).toMatch(/border-radius:\s*var\(--libitum-radius-md\)/);
    expect(body).toMatch(/background-color:\s*var\(--libitum-color-white\)/);
    expect(body).toMatch(/opacity:\s*0\s*;/);
    expect(body).toMatch(
      /transition:\s*opacity var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
    );

    const pressed = ruleBody(pressedShadeRule);
    expect(pressed).toMatch(/opacity:\s*var\(--libitum-opacity-pressed-shade,\s*0\.08\)/);
    const fallback = Number(
      /opacity:\s*var\(--libitum-opacity-pressed-shade,\s*([\d.]+)\)/.exec(pressed)?.[1] ??
        Number.NaN,
    );
    expect(fallback).toBe(opacity["pressed-shade"]);
  });

  it("U-R5. 비항등 scale 리터럴이 없고 그러데이션 규칙에 opacity · transform이 없다", () => {
    const nonIdentity = (css.match(/scale\(\s*[\d.]+\s*\)/g) ?? []).filter(
      (literal) => Number(/([\d.]+)/.exec(literal)?.[1] ?? Number.NaN) !== 1,
    );
    expect(nonIdentity).toEqual([]);
    const gradient = ruleBody(/\.roleplay-card-shade/);
    expect(gradient).toMatch(/linear-gradient/);
    expect(gradient).not.toMatch(/opacity|transform/);
  });
});
