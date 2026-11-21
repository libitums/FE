import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { expect, test } from "vitest";

import { AVATAR_TONES, avatarToneOf } from "./ranking-rules";

// `unit` 계층(ADR-0170 D10 RK-U12 ~ U14): 순위 아바타 색 — 이름 해시로 고른 번호, 그 번호의 바탕 색과 흰 이니셜의 대비.

const NAMES = [
  "Linh",
  "Andrés",
  "Putri",
  "Yuki",
  "Nguyen Van An",
  "Somchai",
  "Aung",
  "Maria",
  "Kenji",
  "Siti",
  "Carlos",
  "Mai",
];

test("RK-U12. 같은 이름은 언제나 같은 번호, 번호는 0 ~ 8의 정수", () => {
  for (const name of [...NAMES, "", "  ", "김민지", "Đức"]) {
    const tone = avatarToneOf(name);
    expect(Number.isInteger(tone)).toBe(true);
    expect(tone).toBeGreaterThanOrEqual(0);
    expect(tone).toBeLessThan(AVATAR_TONES);
    expect(avatarToneOf(name)).toBe(tone);
  }
  // 앞뒤 빈칸은 같은 사람입니다.
  expect(avatarToneOf(" Linh ")).toBe(avatarToneOf("Linh"));
});

test("RK-U13. 한 그룹 이름 열둘이 여러 색으로 흩어진다(다섯 이상)", () => {
  expect(new Set(NAMES.map(avatarToneOf)).size).toBeGreaterThanOrEqual(5);
});

// 흰 글(#FFFFFF)과의 WCAG 대비. 이니셜은 label-m(12px 700)이라 작은 글 기준 4.5 이상이어야 합니다.
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};
const contrastWithWhite = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

test("RK-U20. 고정 내 줄의 차이 글(fg-brand)과 바탕(background-elevated) 대비 4.5 이상, 생략 점(fg-neutral-subtle)은 화면 바탕 대비 3 이상", () => {
  const require = createRequire(import.meta.url);
  const tokens = readFileSync(require.resolve("@libitums/design-tokens/css/variables.css"), "utf8");
  const hex = (name: string): string =>
    new RegExp(`--libitum-color-${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(tokens)?.[1] ?? "#FFFFFF";
  expect(contrast(hex("fg-brand"), hex("background-elevated"))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(hex("fg-neutral-subtle"), hex("background-primary"))).toBeGreaterThanOrEqual(3);
});

test("RK-U14. 색 아홉 모두 규칙이 있고, 흰 이니셜과 대비 4.5 이상이다", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/screens/ranking/ranking-screen.css"),
    "utf8",
  );
  const require = createRequire(import.meta.url);
  const tokens = readFileSync(require.resolve("@libitums/design-tokens/css/variables.css"), "utf8");
  const tokenHex = (name: string): string =>
    new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(tokens)?.[1] ?? "";

  expect(css).toMatch(
    /\.ranking-face \.ui-lynx-avatar-initials\s*\{[^}]*color:\s*var\(--libitum-color-white\)/,
  );
  for (let tone = 0; tone < AVATAR_TONES; tone += 1) {
    const rule = new RegExp(
      `\\.ranking-face-tone-${tone} \\.ui-lynx-avatar-content-initials\\s*\\{[^}]*background-color:\\s*([^;]+);`,
    ).exec(css);
    expect(rule, `tone ${tone}`).not.toBeNull();
    const value = (rule?.[1] ?? "").trim();
    const hex = value.startsWith("var(--") ? tokenHex(value.slice(6, -1)) : value;
    expect(hex, `tone ${tone}: ${value}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(contrastWithWhite(hex), `tone ${tone}: ${hex}`).toBeGreaterThanOrEqual(4.5);
  }
});
