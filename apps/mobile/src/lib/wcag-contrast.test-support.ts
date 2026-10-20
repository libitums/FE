// 대비 단위 테스트가 함께 쓰는 계산 도구입니다. 제품 코드는 import하지 않습니다.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { color, opacity } from "@libitums/design-tokens";

export type Rgb = readonly [number, number, number];
export type CssColor = { readonly rgb: Rgb; readonly alpha: number };

const HEX_PATTERN = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
const RGBA_PATTERN = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d*\.?\d+)\s*\)$/;

/** `#RRGGBB` -> alpha 1, `rgba(r, g, b, a)` -> as written. Anything else throws. */
export function parseCssColor(value: string): CssColor {
  const text = value.trim();
  const hex = HEX_PATTERN.exec(text);
  if (hex !== null) {
    return {
      rgb: [parseInt(hex[1] ?? "", 16), parseInt(hex[2] ?? "", 16), parseInt(hex[3] ?? "", 16)],
      alpha: 1,
    };
  }
  const rgba = RGBA_PATTERN.exec(text);
  if (rgba !== null) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
      alpha: Number(rgba[4]),
    };
  }
  throw new Error(`unsupported css color: ${value}`);
}

/** Composites `top` over an opaque `under` color, per channel, without rounding. */
export function compositeOver(top: CssColor, under: Rgb): Rgb {
  const mix = (index: 0 | 1 | 2): number =>
    top.alpha * top.rgb[index] + (1 - top.alpha) * under[index];
  return [mix(0), mix(1), mix(2)];
}

function linear(channel: number): number {
  const unit = channel / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb): number {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

/** WCAG 2.x contrast ratio (>= 1). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const WHITE: Rgb = [255, 255, 255];

/** Worst case of the dark surface: gray-950 x opacity.surface over pure white, from JS tokens. */
export const DARK_SURFACE_WORST: Rgb = compositeOver(
  { rgb: parseCssColor(color.gray["950"]).rgb, alpha: opacity.surface },
  WHITE,
);

const variablesCss = readFileSync(
  resolve(process.cwd(), "node_modules/@libitums/design-tokens/dist/css/variables.css"),
  "utf8",
);

/** `var(--libitum-color-<a>-<b>)` -> the value in variables.css; any other string is returned as is. */
export function tokenColorValue(cssValue: string): string {
  const matched = /^var\((--libitum-color-[A-Za-z0-9-]+)\)$/.exec(cssValue.trim());
  if (matched === null) {
    return cssValue;
  }
  const name = matched[1] ?? "";
  const declared = new RegExp(`${name}:\\s*([^;]+);`).exec(variablesCss);
  if (declared === null) {
    throw new Error(`unknown color token: ${name}`);
  }
  return (declared[1] ?? "").trim();
}

/** Reads a css file under the mobile app root with comments removed. */
export function readCssWithoutComments(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
}

/** Body of the first rule whose selector matches; empty when missing, so later assertions fail on value. */
export function cssRuleBody(css: string, selector: RegExp): string {
  return new RegExp(`(?:^|\\})\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
}

/** File offset of the first rule whose selector matches; -1 when missing. */
export function cssRuleIndex(css: string, selector: RegExp): number {
  const matched = new RegExp(`(?:^|\\})\\s*${selector.source}\\s*\\{`).exec(css);
  return matched === null ? -1 : matched.index;
}

/** Value of `property` in a rule body, trimmed; undefined when absent. */
export function cssDeclaration(body: string, property: string): string | undefined {
  return new RegExp(`(?:^|[\\s;])${property}\\s*:\\s*([^;]+);`).exec(body)?.[1]?.trim();
}

/** The `rgba(...)` of a declaration value as a color, or undefined when it holds no rgba. */
export function rgbaInValue(value: string | undefined): CssColor | undefined {
  const matched = /rgba\([^)]*\)/.exec(value ?? "");
  return matched === null ? undefined : parseCssColor(matched[0]);
}

/** Expected css color for a token color (#RRGGBB) at an opacity token. */
export function tokenColorAt(hex: string, alpha: number): CssColor {
  return { rgb: parseCssColor(hex).rgb, alpha };
}
