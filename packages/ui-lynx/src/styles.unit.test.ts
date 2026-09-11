import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("ui-lynx styles", () => {
  test("RoundButton의 visual frame, icon, hit area size matrix를 고정한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(styles).toMatch(
      /\.ui-lynx-round-button-s \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*28px[^}]*height:\s*28px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-m \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-l \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-xl \.ui-lynx-round-button-surface\s*\{[^}]*width:\s*56px[^}]*height:\s*56px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-s[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*16px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-m[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*18px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-l[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*20px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-xl[^}]*\.ui-lynx-round-button-icon[^}]*width:\s*24px/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button\s*\{[^}]*width:\s*var\(--libitum-spacing-48\)[^}]*height:\s*var\(--libitum-spacing-48\)/,
    );
    expect(styles).toMatch(/\.ui-lynx-round-button-xl\s*\{[^}]*width:\s*56px[^}]*height:\s*56px/);
  });

  test("RoundButton의 spinner와 원형 radius는 고정 token/authoritative 값이다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(styles).toMatch(/\.ui-lynx-round-button-spinner[^}]*width:\s*12px[^}]*height:\s*12px/);
    expect(styles).toMatch(
      /\.ui-lynx-round-button-spinner[^}]*border(?:-width)?:\s*var\(--libitum-stroke-width-regular\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-spinner\s*\{[^}]*border-top-color:\s*transparent/,
    );
    const spinnerBlock = styles.match(/\.ui-lynx-round-button-spinner\s*\{[^}]*\}/)?.[0] ?? "";
    expect(spinnerBlock).not.toMatch(/\banimation(?:-name)?\s*:/);
    expect(styles).not.toMatch(/@keyframes\s+[^\{]*(?:round[-_]?button[-_]?spinner)/i);
    expect(styles).toMatch(
      /\.ui-lynx-round-button(?:-surface|-spinner)[^}]*border-radius:\s*var\(--libitum-radius-full\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-neutral\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-neutral-subtle\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-brand\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-brand\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-border-default\)/,
    );
  });

  test("RoundButton spinner의 variant/state border-color 뒤에 top 투명 override가 온다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const borderColorRules = [
      ".ui-lynx-round-button-neutral.ui-lynx-round-button-loading",
      ".ui-lynx-round-button-brand.ui-lynx-round-button-loading",
      ".ui-lynx-round-button-disabled.ui-lynx-round-button-loading",
    ].map((selector) => {
      const ruleStart = styles.indexOf(selector);
      expect(ruleStart).toBeGreaterThanOrEqual(0);
      const ruleEnd = styles.indexOf("}", ruleStart);
      expect(styles.slice(ruleStart, ruleEnd)).toMatch(/border-color\s*:/);
      return ruleStart;
    });
    const transparentRule = styles.match(
      /(?:\.ui-lynx-round-button-spinner[^,{]*|[^{}]*\.ui-lynx-round-button-spinner[^{}]*)\s*\{[^}]*border-top-color:\s*transparent/,
    );

    expect(transparentRule).not.toBeNull();
    const transparentRuleStart = transparentRule ? styles.indexOf(transparentRule[0]) : -1;
    expect(transparentRuleStart).toBeGreaterThan(Math.max(...borderColorRules));
  });

  test("Pressed는 surface만 95%로 줄이고 loading/disabled에는 적용하지 않는다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(styles).toMatch(
      /\.ui-lynx-round-button:not\(\.ui-lynx-round-button-loading\):not\(\.ui-lynx-round-button-disabled\):active\s+\.ui-lynx-round-button-surface\s*\{[^}]*transform:\s*scale\(0\.95\)/,
    );
  });

  test("focus ring은 strong 2px 두 겹이고 reduced motion은 scale을 제거한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(styles).toMatch(
      /\.ui-lynx-round-button:not\(\.ui-lynx-round-button-disabled\):focus-visible[^}]*box-shadow:\s*0 0 0 var\(--libitum-stroke-width-strong\) var\(--libitum-color-white\),\s*0 0 0 var\(--libitum-spacing-4\) var\(--libitum-color-border-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled(?::focus-visible)?[^}]*box-shadow:\s*none/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\s+\.ui-lynx-round-button-icon\s*\{[^}]*opacity:\s*0\.35/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-round-button-disabled\.ui-lynx-round-button-loading\s+\.ui-lynx-round-button-spinner\s*\{[^}]*opacity:\s*1/,
    );
    expect(styles).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.ui-lynx-round-button:active[\s\S]*transform:\s*none/,
    );
  });
  test("Neutral surface는 gray.900을 쓴다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-button-neutral \.ui-lynx-button-surface\s*\{[^}]*background-color:\s*var\(--libitum-color-gray-900\)/,
    );
  });

  test("brand loading spinner는 white foreground를 쓴다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-button-brand\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-white\)/,
    );
  });

  test("Brand surface는 brand primary이고 라벨과 loading spinner는 white를 쓴다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

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
    expect(styles).toMatch(
      /\.ui-lynx-button-loading\.ui-lynx-button-disabled \.ui-lynx-button-label\s*\{[^}]*color:\s*var\(--libitum-color-border-default\)/,
    );
  });

  test("Button의 loading, pressed, size 계약은 design-system 원본 스펙을 따른다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-button-loading \.ui-lynx-button-surface\s*\{[^}]*column-gap:\s*var\(--libitum-spacing-6\)/,
    );
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
    expect(styles).not.toMatch(/\.ui-lynx-button[^}]*transform:\s*scale/);
  });

  test("BackHeader는 글자 배율에서도 DOM과 시각 읽기 순서를 유지한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

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
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

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
