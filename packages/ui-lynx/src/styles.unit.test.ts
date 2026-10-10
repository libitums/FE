import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { opacity } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

describe("ui-lynx styles", () => {
  const readLegacyStyles = () =>
    ["button/button.css", "back-header/back-header.css", "status-indicator/status-indicator.css"]
      .map((file) => readFileSync(resolve(process.cwd(), "src", file), "utf8"))
      .join("\n");

  test("root stylesheet aggregates component styles", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toContain('@import "./button/button.css"');
    expect(styles).toContain('@import "./back-header/back-header.css"');
    expect(styles).toContain('@import "./status-indicator/status-indicator.css"');
    expect(styles).toContain('@import "./round-button/round-button.css"');
    expect(styles).toContain('@import "./bottom-navigator/bottom-navigator.css"');
    expect(styles).toContain('@import "./dialog/dialog.css"');
    expect(styles).toContain('@import "./answer-label/answer-label.css"');
    expect(styles).toContain('@import "./avatar/avatar.css"');
    expect(styles).toContain('@import "./compact-numeric-input/compact-numeric-input.css"');
    expect(styles).toContain('@import "./bottom-sheet/bottom-sheet.css"');
    expect(styles).toContain('@import "./text-field/text-field.css"');
    expect(styles).toContain('@import "./option-selector/option-selector.css"');
    expect(styles).toContain('@import "./learning-unit/learning-unit.css"');
    expect(readLegacyStyles()).toContain(".ui-lynx-button");
    expect(readLegacyStyles()).toContain(".ui-lynx-back-header");
    expect(readLegacyStyles()).toContain(".ui-lynx-status-indicator");
  });

  test("Neutral surface는 gray.900을 쓴다", () => {
    const styles = readLegacyStyles();

    expect(styles).toMatch(
      /\.ui-lynx-button-neutral \.ui-lynx-button-surface\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-900\)/,
    );
  });

  test("brand loading spinner는 white foreground를 쓴다", () => {
    const styles = readLegacyStyles();

    expect(styles).toMatch(
      /\.ui-lynx-button-brand\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-white\)/,
    );
  });

  test("Brand surface는 brand primary이고 라벨과 loading spinner는 white를 쓴다", () => {
    const styles = readLegacyStyles();

    expect(styles).toMatch(
      /\.ui-lynx-button-brand \.ui-lynx-button-label\s*\{[^}]*color:\s*var\(--libitum-color-white\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-button-brand \.ui-lynx-button-surface\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-primary\)/,
    );
    expect(styles).not.toContain("--libitum-color-background-accent");
    expect(styles).toMatch(
      /\.ui-lynx-button-loading\.ui-lynx-button-disabled \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-border-default\)/,
    );
    // BL3: 라벨은 visibility로 숨으므로 disabled loading 라벨 색 규칙은 없다.
    expect(styles).not.toMatch(
      /\.ui-lynx-button-loading\.ui-lynx-button-disabled \.ui-lynx-button-label\s*\{/,
    );
  });

  test("Button의 loading, pressed, size 계약은 design-system 원본 스펙을 따른다", () => {
    const styles = readLegacyStyles();

    // BL1: spinner wrap의 기준 박스가 되고 column-gap은 없다.
    const loadingSurface =
      /\.ui-lynx-button-loading \.ui-lynx-button-surface\s*\{([^}]*)\}/.exec(styles)?.[1] ?? "";
    expect(loadingSurface).toMatch(/position:\s*relative/);
    expect(loadingSurface).not.toContain("column-gap");
    expect(styles).toMatch(
      /\.ui-lynx-button-outline\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-neutral-muted\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-button-subtle\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-neutral-muted\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-button-text\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-brand\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-button-l \.ui-lynx-button-label\s*\{[^}]*font-size:\s*var\(--libitum-typography-button-l-font-size\)/,
    );
    expect(styles).not.toContain("brand-primary-pressed");
    // U-B2: scale 리터럴 금지는 Button 밖 두 파일에 그대로 건다(Button은 아래 눌림 케이스가 진다).
    const others = ["back-header/back-header.css", "status-indicator/status-indicator.css"]
      .map((file) => readFileSync(resolve(process.cwd(), "src", file), "utf8"))
      .join("\n");
    expect(others).not.toContain("transform: scale");
  });

  describe("button.css loading 회전", () => {
    const css = () => readFileSync(resolve(process.cwd(), "src/button/button.css"), "utf8");
    const bodyOf = (selector: RegExp): string =>
      new RegExp(`(?:^|[}/])\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? "";

    test("U-B7 · BL2′. spinner wrap은 top·left 0과 width·height 100%로 surface를 덮고 right·bottom이 없다", () => {
      const body = bodyOf(/\.ui-lynx-button-spinner-wrap/);
      expect(body).toMatch(/position:\s*absolute/);
      expect(body).toMatch(/top:\s*0\b/);
      expect(body).toMatch(/left:\s*0\b/);
      expect(body).toMatch(/width:\s*100%/);
      expect(body).toMatch(/height:\s*100%/);
      expect(body).toMatch(/display:\s*flex/);
      expect(body).not.toMatch(/\b(?:right|bottom)\s*:/);
    });

    test("BL3. loading disabled의 spinner border-color는 그대로 border-default다", () => {
      expect(
        bodyOf(/\.ui-lynx-button-loading\.ui-lynx-button-disabled \.ui-lynx-button-spinner/),
      ).toMatch(/border-color:\s*var\(--libitum-color-border-default\)/);
    });

    test("SP5. keyframes는 0 → 360도이고 loading spinner가 spinner 토큰으로 돈다", () => {
      expect(css()).toMatch(
        /@keyframes\s+ui-lynx-button-spin\s*\{\s*from\s*\{[^}]*rotate\(0deg\)[^}]*\}\s*to\s*\{[^}]*rotate\(360deg\)[^}]*\}\s*\}/,
      );
      expect(bodyOf(/\.ui-lynx-button-loading \.ui-lynx-button-spinner/)).toMatch(
        /animation:\s*ui-lynx-button-spin var\(--libitum-motion-duration-spinner\) var\(--libitum-motion-easing-linear\) infinite/,
      );
    });

    test("SP6. 상단 투명 규칙이 있고 모든 spinner border-color 규칙보다 뒤에 온다", () => {
      const text = css();
      const top =
        /\.ui-lynx-button\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-top-color:\s*transparent/.exec(
          text,
        );
      expect(top).not.toBeNull();
      const colorRules = [
        ...text.matchAll(/[^{}]*\.ui-lynx-button-spinner\s*\{[^}]*border-color:[^}]*\}/g),
      ];
      expect(colorRules.length).toBeGreaterThan(0);
      for (const rule of colorRules) {
        expect(rule.index + rule[0].length).toBeLessThanOrEqual(top?.index ?? -1);
      }
    });

    test("BL4. 정적 spinner 블록에는 animation이 없고 12px 크기 token은 그대로다", () => {
      const block = bodyOf(/\.ui-lynx-button-spinner/);
      expect(block).not.toMatch(/\banimation(?:-name)?\s*:/);
      expect(block).toMatch(/width:\s*var\(--libitum-spacing-12\)/);
      expect(block).toMatch(/height:\s*var\(--libitum-spacing-12\)/);
    });
  });

  describe("button.css 눌림 · 막", () => {
    const css = () => readFileSync(resolve(process.cwd(), "src/button/button.css"), "utf8");
    const rule = (selector: RegExp): string =>
      new RegExp(`(?:^|[}/])\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? "";
    const pressedActive =
      /\.ui-lynx-button:not\(\.ui-lynx-button-loading\):not\(\.ui-lynx-button-disabled\):active\s+\.ui-lynx-button-surface/;
    const reducedActive =
      /\.ui-lynx-button-motion-reduced:not\(\.ui-lynx-button-loading\):not\(\.ui-lynx-button-disabled\):active\s+\.ui-lynx-button-surface/;
    const reducedShade =
      /\.ui-lynx-button-motion-reduced:not\(\.ui-lynx-button-loading\):not\(\.ui-lynx-button-disabled\):active\s+\.ui-lynx-button-shade/;

    test("U-B1. loading · disabled가 아닌 눌림 surface가 pressed scale 토큰으로 줄어든다", () => {
      expect(rule(pressedActive)).toMatch(
        /transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/,
      );
    });

    test("U-B2. surface base가 transform 전환을 갖는다", () => {
      expect(rule(/\.ui-lynx-button-surface/)).toMatch(
        /transition:\s*transform var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
      );
    });

    test("U-B2. button.css에 비항등 scale 리터럴이 없다", () => {
      const literals = (css().match(/scale\(\s*[\d.]+\s*\)/g) ?? []).filter(
        (literal) => Number(/([\d.]+)/.exec(literal)?.[1] ?? Number.NaN) !== 1,
      );
      expect(literals).toEqual([]);
    });

    test("U-B3. reduced 눌림은 transform: none이고 reduced surface가 기준 박스다", () => {
      expect(rule(reducedActive)).toMatch(/transform:\s*none/);
      expect(rule(/\.ui-lynx-button-motion-reduced\s+\.ui-lynx-button-surface/)).toMatch(
        /position:\s*relative/,
      );
    });

    test("U-B8. 막은 surface를 덮는 투명 박스이고 neutral은 white, size별 radius를 따른다", () => {
      const body = rule(/\.ui-lynx-button-shade/);
      expect(body).toMatch(/position:\s*absolute/);
      expect(body).toMatch(/top:\s*0\b/);
      expect(body).toMatch(/left:\s*0\b/);
      expect(body).toMatch(/width:\s*100%/);
      expect(body).toMatch(/height:\s*100%/);
      expect(body).toMatch(/background-color:\s*var\(--libitum-color-black\)/);
      expect(body).toMatch(/opacity:\s*0\s*;/);
      expect(body).toMatch(
        /transition:\s*opacity var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
      );
      expect(rule(/\.ui-lynx-button-neutral \.ui-lynx-button-shade/)).toMatch(
        /background-color:\s*var\(--libitum-color-white\)/,
      );
      expect(
        rule(
          /\.ui-lynx-button-s \.ui-lynx-button-shade,\s*\.ui-lynx-button-m \.ui-lynx-button-shade/,
        ),
      ).toMatch(/border-radius:\s*var\(--libitum-radius-md\)/);
      expect(
        rule(
          /\.ui-lynx-button-l \.ui-lynx-button-shade,\s*\.ui-lynx-button-xl \.ui-lynx-button-shade/,
        ),
      ).toMatch(/border-radius:\s*var\(--libitum-radius-lg\)/);
    });

    test("U-B9. 눌린 reduced 막만 pressed-shade 투명도를 갖고 fallback이 토큰과 같다", () => {
      const body = rule(reducedShade);
      expect(body).toMatch(/opacity:\s*var\(--libitum-opacity-pressed-shade,\s*0\.08\)/);
      const fallback = Number(
        /opacity:\s*var\(--libitum-opacity-pressed-shade,\s*([\d.]+)\)/.exec(body)?.[1] ??
          Number.NaN,
      );
      expect(fallback).toBe(opacity["pressed-shade"]);
    });
  });

  test("BackHeader는 글자 배율에서도 DOM과 시각 읽기 순서를 유지한다", () => {
    const styles = readLegacyStyles();

    expect(styles).toMatch(/\.ui-lynx-back-header\s*\{[^}]*align-items:\s*flex-start/);
    expect(styles).toMatch(/\.ui-lynx-back-header-leading\s*\{[^}]*align-items:\s*flex-start/);
    expect(styles).toMatch(
      /\.ui-lynx-back-header-copy\s*\{[^}]*min-height:\s*var\(--libitum-spacing-48\)[^}]*justify-content:\s*center/,
    );
    expect(styles).toMatch(/\.ui-lynx-back-header-back-icon-area\s*\{[^}]*flex-shrink:\s*0/);
    expect(styles).toMatch(/\.ui-lynx-back-header-info\s*\{[^}]*flex-shrink:\s*0/);
    expect(styles).toMatch(
      /\.ui-lynx-back-header\s*\{[^}]*position:\s*sticky[^}]*top:\s*var\(--libitum-spacing-0\)[^}]*min-height:\s*var\(--libitum-spacing-64\)[^}]*padding:\s*var\(--libitum-spacing-8\) var\(--libitum-spacing-16\)[^}]*z-index:\s*var\(--libitum-elevation-z-sticky\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-back-header-title\s*\{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/,
    );
  });

  test("Button과 BackHeader control은 focus fallback과 pressed 스타일을 선언한다", () => {
    const styles = readLegacyStyles();

    expect(styles).toMatch(
      /\.ui-lynx-button:focus\s*\{[^}]*box-shadow:[^}]*var\(--libitum-stroke-width-strong\)[^}]*var\(--libitum-color-border-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-back-header-back-icon-area:focus,[^{]*\.ui-lynx-back-header-info:focus\s*\{[^}]*box-shadow:[^}]*var\(--libitum-color-border-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-back-header-leading:active \.ui-lynx-back-header-icon-pressed,[^{]*\.ui-lynx-back-header-info:active \.ui-lynx-back-header-icon-pressed\s*\{[^}]*display:\s*flex/,
    );
  });
});
