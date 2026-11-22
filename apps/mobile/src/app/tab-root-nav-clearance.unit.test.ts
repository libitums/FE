import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

// `unit` 계층: 탭 루트 화면이 바텀 내비게이션 몫의 아래 여백을 잡는가(fix/ranking-bottom-under-nav).
// 바 묶음(`.app-navigator`)은 셸 위에 절대 배치로 겹치고, 그 높이 68pt(위 8 + 항목 48 + 아래 12)만큼 아래를
// 비우는 일은 각 화면이 집니다(app.css). 순위 탭(ADR-0170)은 이 여백이 없어 내 줄 고정 칸이 바 밑에 깔렸습니다.
// 여정 지도는 `mapContentInsets`가 따로 맞춥니다(journey-map-insets 테스트 IN2) — 여기 넣지 않습니다.

const NAV_CLEARANCE =
  /padding-bottom:\s*calc\(\s*var\(--libitum-spacing-64\)\s*\+\s*var\(--libitum-spacing-4\)/;

function cssRule(file: string, selector: string): string {
  const css = readFileSync(resolve(process.cwd(), file), "utf8");
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  return match?.[1] ?? "";
}

const TAB_ROOTS = [
  {
    tab: "messenger",
    file: "src/screens/messenger-chat/messenger-list.css",
    rule: ".messenger-list-list",
  },
  { tab: "ranking", file: "src/screens/ranking/ranking-screen.css", rule: ".ranking-screen" },
  { tab: "more · Letters", file: "src/screens/letters/letters-screen.css", rule: ".letters-list" },
  {
    tab: "more · My words",
    file: "src/screens/wordbook/wordbook-screen.css",
    rule: ".wordbook-list",
  },
  {
    tab: "more · Settings",
    file: "src/screens/settings/settings-screen.css",
    rule: ".settings-screen-list",
  },
] as const;

test.each(TAB_ROOTS)(
  "NC1. $tab 탭 루트($rule)는 아래 여백에 바 높이(64 + 4)를 잡는다",
  ({ file, rule }) => {
    expect(cssRule(file, rule)).toMatch(NAV_CLEARANCE);
  },
);
