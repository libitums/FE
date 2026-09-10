import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("ui-lynx styles", () => {
  test("brand loading spinner는 3:1 이상 대비를 갖는 semantic foreground token을 쓴다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(
      /\.ui-lynx-button-brand\.ui-lynx-button-loading \.ui-lynx-button-spinner\s*\{[^}]*border-color:\s*var\(--libitum-color-fg-neutral\)/,
    );
  });

  test("BackHeader는 글자 배율에서도 DOM과 시각 읽기 순서를 유지한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(styles).toMatch(/\.ui-lynx-back-header\s*\{[^}]*align-items:\s*flex-start/);
    expect(styles).toMatch(/\.ui-lynx-back-header-leading\s*\{[^}]*align-items:\s*flex-start/);
    expect(styles).toMatch(
      /\.ui-lynx-back-header-copy\s*\{[^}]*min-height:\s*var\(--libitum-spacing-48\)[^}]*justify-content:\s*center/,
    );
    expect(styles).toMatch(/\.ui-lynx-back-header-back\s*\{[^}]*flex-shrink:\s*0/);
    expect(styles).toMatch(/\.ui-lynx-back-header-info\s*\{[^}]*flex-shrink:\s*0/);
  });
});
