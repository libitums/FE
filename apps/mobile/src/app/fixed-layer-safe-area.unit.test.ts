import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { expect, test } from "vitest";

// `unit` 계층(SA-FIX1): 화면 전체를 덮는 층(`position: fixed`)은 앱 셸의 안전 영역 여백을 받지 못합니다. 위에 누를 것(닫기 · 뒤로 ·
// 메뉴)이 있으면 iOS가 터치를 가져가는 상태 표시줄 · 노치 · 다이내믹 아일랜드 아래에 섭니다(2026-11-17 사진 보기, iPhone 13 mini).
// 그래서 fixed 층을 쓰는 컴포넌트는 안전 영역(`safeAreaInsetsFrom` · `insetTop`)을 읽거나, 아래 목록에 까닭과 함께 올라 있어야 합니다.

const SRC = resolve(process.cwd(), "src");

/** 안전 영역을 읽지 않아도 되는 fixed 층과 그 까닭입니다. 새 층을 여기에 올릴 때는 위에 누를 것이 없음을 확인합니다. */
const EXEMPT: Readonly<Record<string, string>> = {
  "journey-stat-modal-flight": "날아가는 엽전 움직임만 — 누를 것 없음",
  "ticket-dialog": "가운데 상자(ui-lynx Dialog) — 위에 누를 것 없음",
  "update-notice": "가운데 상자(ui-lynx Dialog) — 위에 누를 것 없음",
  launch: "가운데 상자, 단추는 상자 아래 · 위아래 48 여백",
  "chat-modal": "가운데 상자(ChatModalFrame), 단추는 상자 아래",
  "first-unit-guide": "가운데 안내 상자 — 위에 누를 것 없음",
  "first-unit-map-scrim": "맵을 덮는 딤만 — 누를 것 없음",
  "more-menu-catch": "더보기 메뉴 바깥 막(투명) — 누르면 닫힘만, 위에 누를 것 없음(ADR-0168)",
};

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function fixedLayerClasses(): { name: string; file: string }[] {
  const layers: { name: string; file: string }[] = [];
  for (const file of walk(SRC).filter((path) => path.endsWith(".css"))) {
    const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/position:\s*fixed/.test(rule[2] ?? "")) continue;
      // 쉼표로 나뉜 선택자마다, 실제로 고정되는 요소(마지막 클래스)를 층으로 셉니다(`.a .b`면 `.b`).
      for (const part of (rule[1] ?? "").split(",")) {
        const classes = [...part.matchAll(/\.([a-z0-9-]+)/g)].map((match) => match[1]);
        const name = classes[classes.length - 1];
        if (name !== undefined) layers.push({ name, file: relative(SRC, file) });
      }
    }
  }
  return layers;
}

test("SA-FIX1 fixed 층을 쓰는 컴포넌트는 위 안전 영역을 읽거나 까닭과 함께 면제 목록에 있다", () => {
  const sources = walk(SRC)
    .filter((path) => path.endsWith(".tsx") && !path.includes(".test."))
    .map((path) => ({ path: relative(SRC, path), text: readFileSync(path, "utf8") }));
  const layers = fixedLayerClasses();
  expect(layers.length).toBeGreaterThan(5);
  const missing: string[] = [];
  for (const { name, file } of layers) {
    if (EXEMPT[name] !== undefined) continue;
    const used = new RegExp(`["\\s\`]${name}["\\s\`$]`);
    for (const source of sources.filter((candidate) => used.test(candidate.text))) {
      if (!/safeAreaInsetsFrom|insetTop/.test(source.text))
        missing.push(`${name} (${file}) ← ${source.path}`);
    }
  }
  expect(missing).toEqual([]);
});
