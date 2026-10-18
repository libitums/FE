import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import { getSpecialUnitContract, hasSpecialUnitPressedShade } from "./special-unit.contract";
import type { SpecialUnitStatus } from "./special-unit.contract";

const statuses: readonly SpecialUnitStatus[] = [
  "default",
  "checking",
  "available",
  "active",
  "clear",
];

describe("getSpecialUnitContract", () => {
  test("SU1. 기본값은 잠긴 Default이고 입력과 focus를 받지 않는다", () => {
    expect(getSpecialUnitContract({ accessibilityLabel: "Episode intro" })).toEqual({
      testId: "ui-lynx-special-unit",
      status: "default",
      className: "ui-lynx-special-unit ui-lynx-special-unit-default",
      accessibilityLabel: "Episode intro, locked",
      traits: "disabled",
      interactive: false,
      iconColor: color.white,
      focused: false,
    });
  });

  test.each([
    ["default", false, "disabled", "locked", color.white],
    ["checking", false, "disabled", "loading", color.gray[400]],
    ["available", true, "button", undefined, color.white],
    ["active", true, "button", "current", color.white],
    ["clear", true, "button", "completed", color.white],
  ] as const)("SU2. %s 상태 계약", (status, interactive, traits, suffix, iconColor) => {
    const name = "A Call from Minseo";
    const contract = getSpecialUnitContract({ accessibilityLabel: name, status });
    expect(contract.status).toBe(status);
    expect(contract.interactive).toBe(interactive);
    expect(contract.traits).toBe(traits);
    expect(contract.iconColor).toBe(iconColor);
    expect(contract.accessibilityLabel).toBe(suffix === undefined ? name : `${name}, ${suffix}`);
    expect(contract.className.split(" ")[1]).toBe(`ui-lynx-special-unit-${status}`);
    expect(JSON.stringify(contract)).not.toContain("story");
  });

  test.each(["default", "checking"] as const)("SU3. %s에서는 focused를 무시한다", (status) => {
    const contract = getSpecialUnitContract({ accessibilityLabel: "X", status, focused: true });
    expect(contract.focused).toBe(false);
    expect(contract.className).not.toContain("-focused");
  });

  test.each(["available", "active", "clear"] as const)(
    "SU3. %s에서는 focused 클래스가 셋째 토큰이다",
    (status) => {
      const contract = getSpecialUnitContract({ accessibilityLabel: "X", status, focused: true });
      expect(contract.focused).toBe(true);
      expect(contract.className.split(" ")[2]).toBe("ui-lynx-special-unit-focused");
    },
  );

  test("SU4. id를 주면 testid 뒤에 붙고 빈 id는 던진다", () => {
    expect(getSpecialUnitContract({ id: "tutorial-intro", accessibilityLabel: "X" }).testId).toBe(
      "ui-lynx-special-unit-tutorial-intro",
    );
    expect(() => getSpecialUnitContract({ id: " ", accessibilityLabel: "X" })).toThrow("id");
  });

  test.each([
    [null, "SpecialUnit"],
    ["label", "SpecialUnit"],
    [{ accessibilityLabel: "" }, "accessibilityLabel"],
    [{ accessibilityLabel: "  " }, "accessibilityLabel"],
    [{ accessibilityLabel: "X", status: "locked" }, "status"],
    [{ accessibilityLabel: "X", focused: "yes" }, "focused"],
    [{ accessibilityLabel: "X", bindtap: 1 }, "bindtap"],
  ])("SU5. 잘못된 입력 %o을 거부한다", (props, message) => {
    expect(() => getSpecialUnitContract(props as never)).toThrow(message);
  });

  test("SU5. 이름의 앞뒤 공백은 trim한다", () => {
    expect(getSpecialUnitContract({ accessibilityLabel: "  Episode intro  " })).toMatchObject({
      accessibilityLabel: "Episode intro, locked",
    });
    expect(
      getSpecialUnitContract({ accessibilityLabel: " Episode intro ", status: "available" })
        .accessibilityLabel,
    ).toBe("Episode intro");
  });

  test("SU6. 컨텍스트 reduced면 className 마지막 토큰이 reduced이고 필드 집합은 그대로다", () => {
    const props = { accessibilityLabel: "X", status: "available", focused: true } as const;
    const reduced = getSpecialUnitContract(props, "reduced");
    const tokens = reduced.className.split(" ");
    expect(tokens.at(-1)).toBe("ui-lynx-special-unit-motion-reduced");
    expect(tokens.at(-2)).toBe("ui-lynx-special-unit-focused");
    expect(Object.keys(reduced)).toEqual(Object.keys(getSpecialUnitContract(props)));
    expect(getSpecialUnitContract(props).className).not.toContain("motion");
  });
});

describe("hasSpecialUnitPressedShade", () => {
  test.each(["available", "active", "clear"] as const)(
    "SU7. reduced이고 %s면 막을 낸다",
    (status) => {
      expect(hasSpecialUnitPressedShade(status, "reduced")).toBe(true);
    },
  );

  test.each(["default", "checking"] as const)("SU7. reduced여도 %s는 막이 없다", (status) => {
    expect(hasSpecialUnitPressedShade(status, "reduced")).toBe(false);
  });

  test("SU7. standard에서는 어느 상태도 막이 없다", () => {
    for (const status of statuses) {
      expect(hasSpecialUnitPressedShade(status, "standard")).toBe(false);
    }
  });
});

describe("iconColor 토큰", () => {
  test("SU8. 다섯 상태의 아이콘 색은 토큰 값이고 정답 색 · 브랜드 색이 아니다", () => {
    const tokenValues = new Set<string>();
    const collect = (node: unknown): void => {
      if (typeof node === "string") tokenValues.add(node);
      else if (node !== null && typeof node === "object") Object.values(node).forEach(collect);
    };
    collect(color);

    for (const status of statuses) {
      const { iconColor } = getSpecialUnitContract({ accessibilityLabel: "X", status });
      expect(tokenValues.has(iconColor)).toBe(true);
      expect(iconColor).not.toBe(color.brand.primary);
      expect(iconColor).not.toBe(color.feedback.correct);
    }
  });
});

// CSS 텍스트 단언 — 색은 jsdom에서 보지 않으므로 선택자와 토큰 변수의 대응을 문자열로 지킵니다.

const readCss = (): string => {
  const path = resolve(process.cwd(), "src/special-unit/special-unit.css");
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

type Rule = { readonly selector: string; readonly body: string };

const rulesOf = (css: string): readonly Rule[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? "").replace(/\s+/g, " ").trim(),
    body: (match[2] ?? "").replace(/\s+/g, " ").trim(),
  }));

/** 선택자가 정확히 같은 규칙들의 본문을 이어 붙입니다. 없으면 빈 문자열입니다. */
const bodyOf = (css: string, selector: string): string =>
  rulesOf(css)
    .filter((rule) => rule.selector === selector)
    .map((rule) => rule.body)
    .join(" ");

const backgroundOf = (body: string): string | undefined =>
  [...body.matchAll(/background-color:\s*([^;]+);/g)].at(-1)?.[1]?.trim();

const block = "ui-lynx-special-unit";
const part = (name: string): string => `.${block}-${name}`;

describe("special-unit.css", () => {
  const css = readCss();

  const faceShade: Readonly<Record<SpecialUnitStatus, readonly [string, string]>> = {
    default: ["gray-500", "gray-600"],
    checking: ["gray-300", "transparent"],
    available: ["brand-primary", "brand-strong"],
    active: ["brand-primary", "brand-strong"],
    clear: ["feedback-correct", "feedback-correct-text"],
  };
  const toValue = (token: string): string =>
    token === "transparent" ? token : `var(--libitum-color-${token})`;

  test.each(statuses)("SC1. %s의 면 · Shade · Halo 색", (status) => {
    const [face, shade] = faceShade[status];
    const at = (name: string): string => bodyOf(css, `${part(status)} ${part(name)}`);
    expect(backgroundOf(at("face"))).toBe(toValue(face));
    expect(backgroundOf(at("shade"))).toBe(toValue(shade));
    const halo = backgroundOf(at("halo"));
    const allowed =
      status === "active"
        ? ["var(--libitum-color-brand-reward-disabled-surface)"]
        : [undefined, "transparent"];
    expect(allowed).toContain(halo);
  });

  test("SC4. 기하 값", () => {
    expect(bodyOf(css, `.${block}`)).toMatch(/width:\s*124px/);
    expect(bodyOf(css, `.${block}`)).toMatch(/height:\s*124px/);
    const halo = bodyOf(css, part("halo"));
    expect(halo).toMatch(/width:\s*124px/);
    expect(halo).toMatch(/border-radius:\s*40px/);
    const body = bodyOf(css, part("body"));
    for (const declaration of [
      "top: 10px",
      "left: 10px",
      "width: 109px",
      "height: 110px",
      "border-radius: 32px",
    ]) {
      expect(body).toContain(declaration);
    }
    const shade = bodyOf(css, part("shade"));
    expect(shade).toContain("top: 6px");
    expect(shade).toContain("left: 5px");
    for (const name of ["shade", "face"]) {
      expect(bodyOf(css, part(name))).toMatch(/width:\s*104px/);
      expect(bodyOf(css, part(name))).toMatch(/height:\s*104px/);
    }
    expect(bodyOf(css, part("icon"))).toMatch(/width:\s*46px/);
  });

  test("SC5. focus ring은 Body의 두 겹 box-shadow다", () => {
    const body = bodyOf(css, `${part("focused")} ${part("body")}`);
    expect(body).toContain(
      "box-shadow: 0 0 0 var(--libitum-stroke-width-strong) var(--libitum-color-white), 0 0 0 var(--libitum-spacing-4) var(--libitum-color-border-strong)",
    );
  });

  test("SC6. 금지 선언이 없다", () => {
    expect(css.length).toBeGreaterThan(0);
    expect(css).not.toContain("[data-");
    expect(css).not.toContain(":focus-visible");
    expect(css).not.toContain("text-transform");
    expect(css.match(/box-shadow:/g) ?? []).toHaveLength(1);
    expect(css).not.toMatch(/\d(ms|s)\b/);
    expect(css).not.toMatch(/cubic-bezier|\bease(-in|-out|-in-out)?\b|\blinear\b/);
  });
});
