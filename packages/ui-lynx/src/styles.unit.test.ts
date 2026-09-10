import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("ui-lynx styles", () => {
  test("brand loading spinner는 white foreground를 쓴다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-button-brand\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-white\)/,
    );
  });

  test("Brand 라벨은 white이고 loading disabled spinner는 disabled 표면과 구분된다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-button-brand \.ui-lynx-button-label\s*\{[^}]*color:\s*var\(--libitum-color-white\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-button-brand \.ui-lynx-button-surface\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-strong\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-button-loading\.ui-lynx-button-disabled \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-border-default\)/,
    );
  });

  test("Button의 loading, pressed, size 계약은 design-system 원본 스펙을 따른다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-button-loading \.ui-lynx-button-surface\s*\{[^}]*column-gap:\s*var\(--libitum-spacing-6\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-button-outline\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-border-default\)/,
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
    expect(styles).not.toContain("transform: scale");
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
