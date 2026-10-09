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

  test("CS6. Card와 Tooltip에는 reduced 변형 규칙이 없다", () => {
    expect(readCss("card/card.css")).not.toContain("-motion-reduced");
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

  test("SC4′. 세 파일에 비항등 scale 리터럴이 없다", () => {
    expect(nonIdentity(readCss("round-button/round-button.css"))).toEqual([]);
    expect(nonIdentity(readCss("learning-unit/learning-unit.css"))).toEqual([]);
    expect(nonIdentity(readCss("dialog/dialog.css"))).toEqual([]);
  });
});
