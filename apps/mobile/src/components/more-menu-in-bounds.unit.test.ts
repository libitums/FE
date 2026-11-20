import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: CSS **문장** 점검입니다(ADR-0169 더보기 메뉴, 버그 fix/more-menu-clipped). 테스트 환경은 레이아웃을 그리지
// 못해 실제 배치는 기기에서 봅니다 — 여기서는 기기에서 확인한 전제를 문장으로 고정합니다.
//
// 기기 확인(2026-11-20, iOS 시뮬레이터 · Android assembleBundled): 카드가 `.app-navigator` 상자 **밖**(바 위,
// `bottom: calc(100% + 8)`)에 서면 묶음 경계에서 잘려 화면에도 접근성 트리에도 나오지 않았습니다. 묶음에
// `overflow: visible`을 주어도, 카드에 `z-index`를 주어도, 묶음의 `z-index`를 빼도 그대로였고, 같은 카드를 묶음 상자
// **안**(`bottom: 0`)에 두면 그려졌습니다. 그래서 카드는 묶음 밖으로 내보내지 않고 바 앞 흐름 자식으로 둬 묶음이 위로
// 자라게 합니다(AppNavigator가 children을 바 앞에 그림 — AppNavigator.ui.test UA8).

// 실행 위치(모노레포 루트 · 패키지)와 상관없게 이 테스트 파일 기준으로 찾습니다.
const read = (relative: string): string => {
  const path = resolve(import.meta.dirname, relative);
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
};

const declarations = (source: string, selector: string): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if ((match[1] ?? "").replace(/\s+/g, " ").trim() !== selector) continue;
    for (const line of (match[2] ?? "").split(";")) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      result[line.slice(0, colon).trim()] = line
        .slice(colon + 1)
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  return result;
};

const menuCss = read("more-menu.css");

describe("더보기 메뉴 카드는 바 묶음(.app-navigator) 상자 안에 선다", () => {
  test("CSS 파일을 읽었다", () => {
    expect(menuCss).not.toBe("");
  });

  test("카드는 절대 배치로 묶음 밖에 나가지 않는다 — position · bottom · top을 적지 않는다", () => {
    const menu = declarations(menuCss, ".more-menu");
    expect(menu).not.toEqual({});
    expect(menu.position).toBeUndefined();
    expect(menu.bottom).toBeUndefined();
    expect(menu.top).toBeUndefined();
  });

  test("바와의 간격 8 · 좌우 16은 카드 자리(.more-menu-slot)의 안쪽 여백이 진다(시안 MoreSheet), 위 16은 그림자 s3(아래 4 · 흐림 16) 몫", () => {
    expect(declarations(menuCss, ".more-menu-slot").padding).toBe(
      "var(--libitum-spacing-16) var(--libitum-spacing-16) var(--libitum-spacing-8)",
    );
    expect(declarations(menuCss, ".more-menu").margin).toBeUndefined();
  });
});
