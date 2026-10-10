import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { opacity } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

const srcDir = resolve(process.cwd(), "src");

const readCss = (file: string) => readFileSync(resolve(srcDir, file), "utf8");

/** 선택자 정규식에 맞는 첫 규칙의 본문(`{ … }` 안쪽)을 돌려줍니다. 규칙이 없으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
const ruleBody = (css: string, selector: RegExp): string =>
  new RegExp(`(?:^|[}/])\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";

const allCssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? allCssFiles(join(dir, entry.name))
      : entry.name.endsWith(".css")
        ? [join(dir, entry.name)]
        : [],
  );

describe("reduced motion css", () => {
  test("CS1. src의 어떤 CSS에도 prefers-reduced-motion 미디어 쿼리가 없다", () => {
    const files = allCssFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((file) =>
      /@media\s*\(prefers-reduced-motion/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  test("CS2. RoundButton reduced는 눌림 surface의 transform과 transition을 없앤다", () => {
    const css = readCss("round-button/round-button.css");
    expect(css).toMatch(
      /\.ui-lynx-round-button-motion-reduced[^{]*:active\s+\.ui-lynx-round-button-surface\s*\{[^}]*transform:\s*none/,
    );
    const body = ruleBody(
      css,
      /\.ui-lynx-round-button-motion-reduced[^{]*:active\s+\.ui-lynx-round-button-surface/,
    );
    expect(body).toMatch(/transition:\s*none/);
  });

  test("CS3. LearningUnit reduced는 눌림 visual의 transform과 transition을 없애고 surface 색 전환은 둔다", () => {
    const css = readCss("learning-unit/learning-unit.css");
    const body = ruleBody(
      css,
      /\.ui-lynx-learning-unit-motion-reduced[^{]*:active\s+\.ui-lynx-learning-unit-visual/,
    );
    expect(body).toMatch(/transition:\s*none/);
    expect(body).toMatch(/transform:\s*none/);
    const surface = ruleBody(css, /\.ui-lynx-learning-unit-surface/);
    expect(surface).toMatch(/transition:\s*background-color/);
  });

  test("CS4. PageIndicator reduced는 항목의 너비 전환을 빼고 색 전환만 남긴다", () => {
    const css = readCss("page-indicator/page-indicator.css");
    const body = ruleBody(
      css,
      /\.ui-lynx-page-indicator-motion-reduced\s+\.ui-lynx-page-indicator-item/,
    );
    expect(body).toMatch(/transition:\s*background-color/);
    expect(body).not.toMatch(/width/);
  });

  test("CS5. SettingsCell reduced는 knob 전환만 없애고 트랙 색 전환은 둔다", () => {
    const css = readCss("settings-cell/settings-cell.css");
    const knob = ruleBody(
      css,
      /\.ui-lynx-settings-cell-motion-reduced\s+\.ui-lynx-settings-cell-switch-knob/,
    );
    expect(knob).toMatch(/transition:\s*none/);
    const track = ruleBody(css, /\.ui-lynx-settings-cell-switch/);
    expect(track).toMatch(/transition:\s*background-color/);
  });

  test("CS6′. Tooltip에는 reduced 변형 규칙이 없고 Card에는 있다", () => {
    expect(readCss("card/card.css")).toContain("ui-lynx-card-motion-reduced");
    expect(readCss("tooltip/tooltip.css")).not.toContain("-motion-reduced");
  });

  test("CS7′. standard 선언은 그대로다", () => {
    expect(readCss("round-button/round-button.css")).toMatch(
      /\.ui-lynx-round-button:not\(\.ui-lynx-round-button-loading\):not\(\.ui-lynx-round-button-disabled\):active\s+\.ui-lynx-round-button-surface\s*\{[^}]*transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/,
    );
    const item = ruleBody(
      readCss("page-indicator/page-indicator.css"),
      /\.ui-lynx-page-indicator-item/,
    );
    expect(item).toMatch(/transition:\s*width/);
    const knob = ruleBody(
      readCss("settings-cell/settings-cell.css"),
      /\.ui-lynx-settings-cell-switch-knob/,
    );
    expect(knob).toMatch(/transition:\s*transform/);
  });
});

describe("scale tokens", () => {
  const pressed = /transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/;
  const enter = /transform:\s*scale\(var\(--libitum-motion-scale-enter\)\)/;

  /** 1이 아닌 `scale(<숫자>)` 리터럴 — 항등값(원상태)은 대상이 아닙니다. */
  const nonIdentity = (css: string): string[] =>
    (css.match(/scale\(\s*[\d.]+\s*\)/g) ?? []).filter(
      (literal) => Number(/([\d.]+)/.exec(literal)?.[1] ?? Number.NaN) !== 1,
    );

  test("SC1′. RoundButton 눌림 scale은 pressed 토큰 변수다", () => {
    const body = ruleBody(
      readCss("round-button/round-button.css"),
      /\.ui-lynx-round-button:not\(\.ui-lynx-round-button-loading\):not\(\.ui-lynx-round-button-disabled\):active\s+\.ui-lynx-round-button-surface/,
    );
    expect(body).toMatch(pressed);
  });

  test("SC2′. Dialog 등장 from · 퇴장 to scale은 enter 토큰 변수다", () => {
    const css = readCss("dialog/dialog.css");
    const keyframe = (name: string, edge: "from" | "to"): string =>
      new RegExp(`@keyframes ${name}\\s*\\{[\\s\\S]*?${edge}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ??
      "";
    expect(keyframe("ui-lynx-dialog-container-enter", "from")).toMatch(enter);
    expect(keyframe("ui-lynx-dialog-container-exit", "to")).toMatch(enter);
  });

  test("SC3′. LearningUnit 눌림 scale은 pressed 토큰 변수다", () => {
    const body = ruleBody(
      readCss("learning-unit/learning-unit.css"),
      /\.ui-lynx-learning-unit:not\(\.ui-lynx-learning-unit-default\):active\s+\.ui-lynx-learning-unit-visual/,
    );
    expect(body).toMatch(pressed);
  });

  test("SC4″. 여섯 파일에 비항등 scale 리터럴이 없다", () => {
    expect(nonIdentity(readCss("button/button.css"))).toEqual([]);
    expect(nonIdentity(readCss("round-button/round-button.css"))).toEqual([]);
    expect(nonIdentity(readCss("learning-unit/learning-unit.css"))).toEqual([]);
    expect(nonIdentity(readCss("dialog/dialog.css"))).toEqual([]);
    expect(nonIdentity(readCss("card/card.css"))).toEqual([]);
    expect(nonIdentity(readCss("option-selector/option-selector.css"))).toEqual([]);
  });
});

describe("pressed shade css", () => {
  type Shade = {
    readonly name: string;
    readonly file: string;
    readonly block: string;
    readonly radius: string;
    /** 눌림 규칙의 선택자(공백은 \\s+로 허용). */
    readonly pressed: RegExp;
    /** reduced surface를 기준 박스로 만드는 규칙의 선택자. */
    readonly surface: RegExp;
  };
  const shades: readonly Shade[] = [
    {
      name: "RoundButton",
      file: "round-button/round-button.css",
      block: "ui-lynx-round-button-shade",
      radius: "full",
      pressed:
        /\.ui-lynx-round-button-motion-reduced:not\(\.ui-lynx-round-button-loading\):not\(\.ui-lynx-round-button-disabled\):active\s+\.ui-lynx-round-button-shade/,
      surface: /\.ui-lynx-round-button-motion-reduced\s+\.ui-lynx-round-button-surface/,
    },
    {
      name: "LearningUnit",
      file: "learning-unit/learning-unit.css",
      block: "ui-lynx-learning-unit-shade",
      radius: "full",
      pressed:
        /\.ui-lynx-learning-unit-motion-reduced:not\(\.ui-lynx-learning-unit-default\):active\s+\.ui-lynx-learning-unit-shade/,
      surface: /\.ui-lynx-learning-unit-motion-reduced\s+\.ui-lynx-learning-unit-surface/,
    },
  ];

  describe.each(shades)("$name", (shade) => {
    test("SH1/SH5. 막은 surface를 덮는 검은 원이고 평소엔 투명하며 opacity로 전환한다", () => {
      const body = ruleBody(readCss(shade.file), new RegExp(`\\.${shade.block}`));
      expect(body).toMatch(/position:\s*absolute/);
      for (const side of ["top", "right", "bottom", "left"]) {
        expect(body).toMatch(new RegExp(`${side}:\\s*0\\b`));
      }
      expect(body).toMatch(/border-radius:\s*var\(--libitum-radius-full\)/);
      expect(body).toMatch(/background-color:\s*var\(--libitum-color-black\)/);
      expect(body).toMatch(/opacity:\s*0\s*;/);
      expect(body).toMatch(
        /transition:\s*opacity var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
      );
    });

    test("SH2/SH6. 눌린 막만 pressed-shade 투명도를 갖고 reduced surface가 기준 박스다", () => {
      const css = readCss(shade.file);
      expect(ruleBody(css, shade.pressed)).toMatch(
        /opacity:\s*var\(--libitum-opacity-pressed-shade,\s*0\.08\)/,
      );
      expect(ruleBody(css, shade.surface)).toMatch(/position:\s*relative/);
    });

    test("SH3/SH7. fallback 숫자는 opacity.pressed-shade 토큰과 같다", () => {
      const css = readCss(shade.file);
      const fallback = Number(
        /opacity:\s*var\(--libitum-opacity-pressed-shade,\s*([\d.]+)\)/.exec(
          ruleBody(css, shade.pressed),
        )?.[1] ?? Number.NaN,
      );
      expect(fallback).toBe(opacity["pressed-shade"]);
    });
  });

  test("SH4. RoundButton reduced 규칙은 회전과 무관하고 1단계 transform: none 규칙이 그대로다", () => {
    const css = readCss("round-button/round-button.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const reducedRules = [...css.matchAll(/([^{}]*-motion-reduced[^{}]*)\{([^}]*)\}/g)];
    expect(reducedRules.length).toBeGreaterThan(0);
    for (const [, selector, body] of reducedRules) {
      expect(`${selector}${body}`).not.toMatch(/spinner|animation/);
    }
    expect(
      ruleBody(
        css,
        /\.ui-lynx-round-button-motion-reduced[^{]*:active\s+\.ui-lynx-round-button-surface/,
      ),
    ).toMatch(
      /transform:\s*none[\s\S]*transition:\s*none|transition:\s*none[\s\S]*transform:\s*none/,
    );
  });

  test("SH8. LearningUnit 1단계 reduced 규칙과 surface 색 전환이 그대로다", () => {
    const css = readCss("learning-unit/learning-unit.css");
    expect(
      ruleBody(
        css,
        /\.ui-lynx-learning-unit-motion-reduced:not\(\.ui-lynx-learning-unit-default\):active\s+\.ui-lynx-learning-unit-visual/,
      ),
    ).toMatch(/transition:\s*none[\s\S]*transform:\s*none/);
    expect(ruleBody(css, /\.ui-lynx-learning-unit-surface/)).toMatch(
      /transition:\s*background-color var\(--libitum-motion-duration-color\)\s+var\(--libitum-motion-easing-easing\)/,
    );
  });
});
