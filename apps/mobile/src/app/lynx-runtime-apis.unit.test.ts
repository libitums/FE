import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { expect, test } from "vitest";

// `unit` 계층(LR1 · LR2): Lynx 배경 스레드에 없는 내장 API를 앱 코드가 쓰지 않는다. vitest(Node)에서는 있어서 테스트가 통과하지만
// 기기에서는 첫 화면을 불러오다 멈춥니다(2026-11-17 `Promise.allSettled` — 「loadCard failed: F.allSettled is not a function」).
//
// 목록은 실측입니다(2026-11-17, Lynx 4.0.1) — 탐침 번들로 배경 스레드에서 맨 이름의 `typeof`와 실제 호출을 찍었습니다.
// - iOS 시뮬레이터(iOS 26.5): Lynx가 배경 코드에 자기 `Promise`를 넣어 줘(`Promise !== globalThis.Promise`) 그 `Promise`에
//   `allSettled` · `any` · `withResolvers`가 없습니다. `queueMicrotask` · `structuredClone` · `TextEncoder` · `atob` · `performance` ·
//   `crypto` · `AbortSignal.timeout`도 없습니다.
// - Android 에뮬레이터(Pixel 8, PrimJS, release와 같은 assembleBundled): 위에 더해 `Array.prototype.at` · `findLast` ·
//   `findLastIndex` · `toSorted` · `toReversed` · `with`, `Object.hasOwn` · `Object.groupBy`, `String.prototype.replaceAll` · `at` ·
//   `normalize`, `Intl` 전체가 없습니다. `toLocaleString` · `toLocaleDateString`은 던지지 않지만 언어 · 옵션을 무시합니다
//   (`1234567`, `11/17/2026`). `Error`의 `cause`는 남지 않고 정규식 `v` 플래그는 던집니다. 메인 스레드도 `at` · `findLast` ·
//   `replaceAll` · `Intl`이 없습니다.
// - 두 쪽 모두 있는 것: `setTimeout` · `setInterval` · `clearInterval` · `requestAnimationFrame` · `fetch`(맨 이름 — `globalThis`에는
//   없음), `Array.prototype.flat` · `flatMap` · `includes`, `Object.fromEntries` · `entries`, `String.prototype.padStart` · `matchAll` ·
//   `trimEnd`, `URL` · `URLSearchParams` · `AbortController` · `WeakRef` · `BigInt`, 정규식 앞보기 · 뒤보기 · 이름 붙은 묶음 · `u` · `s`.
// 그래서 통화 · 숫자는 손으로 씁니다(`provisional-prices.ts` · `coin-shop.ts`). `normalize`는 있을 때만 부릅니다(episode-core 판정).

// 앱 번들에 들어가는 소스 — 앱과 앱이 기대는 작업 공간 패키지(ui-lynx · episode-core).
const ROOTS = [
  resolve(process.cwd(), "src"),
  resolve(process.cwd(), "../../packages/ui-lynx/src"),
  resolve(process.cwd(), "../../packages/episode-core/src"),
];

/** 기기 배경 스레드에 없는 API(호출 꼴)와 대신 쓸 것입니다. 주석 속 이름은 괄호가 없으면 걸리지 않습니다. */
export const MISSING: readonly {
  readonly name: string;
  readonly pattern: RegExp;
  readonly instead: string;
}[] = [
  {
    name: "Promise.allSettled",
    pattern: /\bPromise\.allSettled\s*\(/,
    instead: "각 약속에 .then(ok, fail)을 붙여 끝남만 기다리기",
  },
  { name: "Promise.any", pattern: /\bPromise\.any\s*\(/, instead: "Promise.race / 직접 모으기" },
  {
    name: "Promise.withResolvers",
    pattern: /\bPromise\.withResolvers\s*\(/,
    instead: "new Promise((resolve, reject) => …)",
  },
  {
    name: "structuredClone",
    pattern: /\bstructuredClone\s*\(/,
    instead: "JSON 왕복 또는 직접 복사",
  },
  {
    name: "queueMicrotask",
    pattern: /(?<![.\w])queueMicrotask\s*\(/,
    instead: "Promise.resolve().then(fn)",
  },
  {
    name: "TextEncoder · TextDecoder",
    pattern: /\bnew\s+Text(En|De)coder\s*\(/,
    instead: "직접 UTF-8 셈 / 호스트 모듈",
  },
  {
    name: "atob · btoa",
    pattern: /(?<![.\w])(atob|btoa)\s*\(/,
    instead: "직접 base64 / 호스트 모듈",
  },
  {
    name: "crypto",
    pattern: /\bcrypto\.(randomUUID|getRandomValues)\s*\(/,
    instead: "Math.random 기반 id / 호스트 모듈",
  },
  { name: "performance.now", pattern: /\bperformance\.now\s*\(/, instead: "Date.now()" },
  {
    name: "AbortSignal.timeout",
    pattern: /\bAbortSignal\.timeout\s*\(/,
    instead: "AbortController + setTimeout",
  },
  // ── Android(PrimJS)에 없음 ──
  {
    name: "Array.prototype.at",
    pattern: /\.at\(\s*-?[\w.]+\s*\)/,
    instead: "arr[arr.length - 1] 등 인덱스",
  },
  {
    name: "findLast · findLastIndex",
    pattern: /\.findLast(Index)?\s*\(/,
    instead: "뒤에서부터 도는 for 문",
  },
  {
    name: "toSorted · toReversed · toSpliced",
    pattern: /\.to(Sorted|Reversed|Spliced)\s*\(/,
    instead: "[...arr].sort() / [...arr].reverse()",
  },
  {
    name: "Object.hasOwn",
    pattern: /\bObject\.hasOwn\s*\(/,
    instead: "Object.prototype.hasOwnProperty.call",
  },
  {
    name: "Object.groupBy · Map.groupBy",
    pattern: /\b(Object|Map)\.groupBy\s*\(/,
    instead: "reduce로 모으기",
  },
  {
    name: "String.prototype.replaceAll",
    pattern: /\.replaceAll\s*\(/,
    instead: "replace(/…/g, …)",
  },
  {
    name: "Intl",
    pattern: /\bIntl\.\w+/,
    instead: "손으로 쓴 표기(provisional-prices.ts의 formatMoney 등)",
  },
  {
    name: "toLocale*String에 언어 · 옵션",
    pattern: /\.toLocale(Date|Time)?String\(\s*[^)\s]/,
    instead: "손으로 쓴 표기 — Android는 언어 · 옵션을 무시함",
  },
  {
    name: "clearTimeout 콜백 전달",
    pattern: /\.(forEach|map)\(\s*clear(Timeout|Interval)\s*\)/,
    instead: "(t) => clearTimeout(t) — 기기의 clearTimeout은 인자가 정확히 하나여야 함",
  },
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test("LR1 앱 · ui-lynx 코드는 Lynx 배경 스레드에 없는 내장 API를 쓰지 않는다", () => {
  const found: string[] = [];
  for (const root of ROOTS) {
    for (const path of walk(root)) {
      if (
        !/\.(ts|tsx)$/.test(path) ||
        /\.test(-support)?\./.test(path) ||
        path.includes("test-helpers")
      )
        continue;
      const text = readFileSync(path, "utf8");
      for (const { name, pattern, instead } of MISSING) {
        if (pattern.test(text)) found.push(`${relative(root, path)} — ${name} → ${instead}`);
      }
    }
  }
  expect(found).toEqual([]);
});

test("LR2 금지 목록은 호출 꼴을 잡고, 주석 속 이름 · 다른 객체의 같은 이름 메서드는 잡지 않는다", () => {
  const hits = (code: string) =>
    MISSING.filter(({ pattern }) => pattern.test(code)).map(({ name }) => name);
  expect(hits("await Promise.allSettled([a, b]);")).toEqual(["Promise.allSettled"]);
  expect(hits("const { promise } = Promise.withResolvers();")).toEqual(["Promise.withResolvers"]);
  expect(hits("const copy = structuredClone(state);")).toEqual(["structuredClone"]);
  expect(hits("queueMicrotask(() => flush());")).toEqual(["queueMicrotask"]);
  expect(hits("new TextEncoder().encode(s)")).toEqual(["TextEncoder · TextDecoder"]);
  expect(hits("const raw = atob(b64);")).toEqual(["atob · btoa"]);
  expect(hits("const id = crypto.randomUUID();")).toEqual(["crypto"]);
  expect(hits("const t0 = performance.now();")).toEqual(["performance.now"]);
  expect(hits("fetch(url, { signal: AbortSignal.timeout(5000) })")).toEqual([
    "AbortSignal.timeout",
  ]);
  expect(hits("timers.forEach(clearTimeout);")).toEqual(["clearTimeout 콜백 전달"]);
  // 걸리지 않아야 하는 것: 주석 속 이름(괄호 없음), 다른 객체의 같은 이름, 한 인자 화살표 함수.
  expect(hits("// Lynx에는 `Promise.allSettled`가 없습니다")).toEqual([]);
  expect(hits("if (f.queueMicrotask) f.queueMicrotask(a);")).toEqual([]);
  expect(hits("timers.forEach((t) => clearTimeout(t));")).toEqual([]);
  // Android(PrimJS)에 없는 것.
  expect(hits("const last = items.at(-1);")).toEqual(["Array.prototype.at"]);
  expect(hits("const m = list.findLast((x) => x.ok);")).toEqual(["findLast · findLastIndex"]);
  expect(hits("const s = list.toSorted((a, b) => a - b);")).toEqual([
    "toSorted · toReversed · toSpliced",
  ]);
  expect(hits("if (Object.hasOwn(map, key)) {}")).toEqual(["Object.hasOwn"]);
  expect(hits("const g = Object.groupBy(xs, f);")).toEqual(["Object.groupBy · Map.groupBy"]);
  expect(hits('const t = s.replaceAll("a", "b");')).toEqual(["String.prototype.replaceAll"]);
  expect(hits('new Intl.NumberFormat("vi").format(n)')).toEqual(["Intl"]);
  expect(hits('n.toLocaleString("vi-VN")')).toEqual(["toLocale*String에 언어 · 옵션"]);
  expect(hits('d.toLocaleDateString("ko", { month: "long" })')).toEqual([
    "toLocale*String에 언어 · 옵션",
  ]);
  // 두 쪽 모두 있는 것 · 손으로 쓴 대안은 걸리지 않는다.
  expect(
    hits('const last = items[items.length - 1]; s.replace(/a/g, "b"); xs.includes(1);'),
  ).toEqual([]);
  expect(
    hits("Object.prototype.hasOwnProperty.call(map, key); Object.fromEntries(pairs);"),
  ).toEqual([]);
  // 있는 것(맨 이름으로 확인 — Lynx가 넣어 주는 전역)은 걸리지 않는다.
  expect(hits("const id = setInterval(tick, 1000); clearInterval(id); fetch(url);")).toEqual([]);
});
