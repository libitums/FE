import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { describe, expect, test } from "vitest";

// `unit` 계층(TC1 ~ TC2): Lynx가 그리는 CSS의 시간 값에 `calc()`를 쓰지 않는다(ADR-0212 개정 1).
// 기기에서 잰 결과(2026-11-27, iOS 시뮬레이터 · Android assembleBundled 둘 다): `calc(var(--libitum-motion-duration-d9) * 2)`를
// `animation-delay` · `transition-delay`에 주면 0으로 읽히고, `animation` 단축 속성의 길이에 주면 애니메이션이 아예 돌지 않는다.
// `calc(1000ms * 2)`처럼 `var()`가 없으면 맞게 읽혔지만, 규칙은 시간 값의 `calc(` 전부를 막는다 — 시간 밖의 calc(길이)는 허용.
// 범위는 `lint:motion`과 같은 Lynx 뿌리 셋이다. 랜딩(`apps/landing`)은 브라우저가 그려 calc가 맞게 읽혀 범위 밖이다.

const REPO = resolve(process.cwd(), "../..");
const LYNX_ROOTS = ["apps/mobile/src", "packages/ui-lynx/src", "apps/storybook-lynx/src"];
const TIME_PROPERTIES = new Set([
  "animation",
  "animation-delay",
  "animation-duration",
  "transition",
  "transition-delay",
  "transition-duration",
]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(path);
    return [path];
  });
}

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** CSS 한 파일의 `{ property, value }` 선언(여러 줄 값 포함). */
function declarationsOf(css: string): { property: string; value: string }[] {
  const found: { property: string; value: string }[] = [];
  for (const block of stripComments(css).matchAll(/\{([^{}]*)\}/g)) {
    for (const part of (block[1] ?? "").split(";")) {
      const colon = part.indexOf(":");
      if (colon === -1) continue;
      found.push({
        property: part.slice(0, colon).trim().toLowerCase(),
        value: part
          .slice(colon + 1)
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
  }
  return found;
}

describe("Lynx CSS 시간 값", () => {
  test("TC1. 애니메이션 · 전환의 시간 선언에 calc()가 없다(시간 밖 calc는 허용)", () => {
    const files = LYNX_ROOTS.flatMap((root) => walk(join(REPO, root))).filter((path) =>
      path.endsWith(".css"),
    );
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    let timeDeclarations = 0;
    for (const file of files) {
      for (const { property, value } of declarationsOf(readFileSync(file, "utf8"))) {
        if (!TIME_PROPERTIES.has(property)) continue;
        timeDeclarations += 1;
        if (value.includes("calc("))
          offenders.push(`${relative(REPO, file)} ${property}: ${value}`);
      }
    }
    expect(timeDeclarations).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });

  // 고친 세 파일이 원래 calc가 뜻한 값(d1 = 50ms 배수, d9 × 3)을 그대로 내는지 — 지연 순서와 리듬을 지킨다.
  const tokens = readFileSync(
    createRequire(join(REPO, "apps/mobile/package.json")).resolve(
      "@libitums/design-tokens/css/variables.css",
    ),
    "utf8",
  );
  const msOf = (value: string): number => {
    const token = /^var\((--libitum-motion-duration-[a-z0-9]+)\)$/.exec(value);
    const literal = token
      ? new RegExp(`${token[1]}:\\s*([0-9.]+)ms;`).exec(tokens)?.[1]
      : /^([0-9.]+)ms$/.exec(value)?.[1];
    if (literal === undefined) throw new Error(`시간 값을 읽지 못함: ${value}`);
    return Number(literal);
  };
  /** 선택자의 `animation-delay`(없으면 `animation` 단축 속성의 길이) — 여러 규칙이면 마지막. */
  const timeOf = (file: string, selector: string, property: string): number => {
    const css = stripComments(readFileSync(join(REPO, file), "utf8"));
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blocks = [...css.matchAll(new RegExp(`(?:^|[},])\\s*${escaped}\\s*\\{([^{}]*)\\}`, "g"))];
    const values = blocks.flatMap((block) =>
      declarationsOf(`{${block[1] ?? ""}}`).filter((d) => d.property === property),
    );
    const last = values.at(-1);
    if (last === undefined) throw new Error(`${file} ${selector} ${property} 없음`);
    return msOf(property === "animation" ? (last.value.split(" ")[1] ?? "") : last.value);
  };

  const ranking = "apps/mobile/src/screens/ranking/ranking-motion.css";
  const launch = "apps/mobile/src/screens/launch/launch.css";
  const signup = "apps/mobile/src/screens/signup-reward/signup-reward.css";
  const delays: readonly (readonly [string, string, number])[] = [
    [ranking, ".ranking-in-1", 50],
    [ranking, ".ranking-in-2", 100],
    [ranking, ".ranking-in-3", 150],
    [ranking, ".ranking-in-4", 200],
    [ranking, ".ranking-in-5", 250],
    [ranking, ".ranking-in-6", 300],
    [ranking, ".ranking-in-7", 350],
    [ranking, ".ranking-medal-in-1", 150],
    [ranking, ".ranking-medal-in-2", 200],
    [ranking, ".ranking-medal-in-3", 250],
    [ranking, ".ranking-row-pulse", 700],
    [ranking, ".ranking-ring", 700],
    [launch, ".launch-tag", 400],
    [launch, ".launch-coin-icon", 300],
    [launch, ".launch-row-0", 600],
    [launch, ".launch-row-1", 800],
    [launch, ".launch-row-2", 1000],
    [launch, ".launch-person-0", 350],
    [launch, ".launch-person-1", 450],
    [launch, ".launch-person-2", 550],
    [launch, ".launch-person-3", 650],
    [launch, ".launch-person-4", 750],
    [launch, ".launch-meter-fill", 1000],
    [signup, ".signup-card-pouch", 1000],
    [signup, ".signup-reward-glow", 300],
    [signup, ".signup-reward-pouch", 300],
    [signup, ".signup-reward-pop-0", 750],
    [signup, ".signup-reward-pop-1", 800],
    [signup, ".signup-reward-pop-2", 850],
    [signup, ".signup-reward-pop-3", 900],
    [signup, ".signup-reward-pop-4", 950],
    [signup, ".signup-reward-pop-5", 1000],
    [signup, ".signup-gift", 300],
    [signup, ".signup-gift-unlimited", 500],
  ];

  test.each(delays)("TC2. %s %s 지연은 %d ms", (file, selector, ms) => {
    expect(timeOf(file, selector, "animation-delay")).toBe(ms);
  });

  test("TC2. 가입 카드 주머니의 통 튐 한 주기는 3000 ms(d9 × 3)", () => {
    expect(timeOf(signup, ".signup-card-pouch", "animation")).toBe(3000);
  });
});
