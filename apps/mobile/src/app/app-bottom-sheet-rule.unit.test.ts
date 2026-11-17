import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "vitest";

// `unit` 계층(SB-RULE1): 앱 화면은 ui-lynx `BottomSheet`를 직접 쓰지 않고 `AppBottomSheet`를 쓴다 — 직접 쓰면 Android 아래
// 시스템 바(3버튼 · 제스처)를 비우지 않아 시트 버튼이 가려진다(ADR-0044 D3 개정 2026-11-17). 테스트 파일은 대상이 아니다.

const SRC = join(__dirname, "..");
const WRAPPER = "components/app-bottom-sheet/AppBottomSheet.tsx";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test("SB-RULE1 ui-lynx BottomSheet은 AppBottomSheet만 가져온다", () => {
  const offenders = walk(SRC)
    .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test(-support)?\./.test(path))
    .map((path) => ({ path: relative(SRC, path), text: readFileSync(path, "utf8") }))
    // 값 `BottomSheet`를 가져오는 줄만 셉니다 — 스타일 · 타입(`import type`) · `shouldDismissBottomSheetDrag`는 괜찮습니다.
    .filter(
      ({ path, text }) =>
        path !== WRAPPER &&
        /import\s*\{[^}]*\bBottomSheet\b[^}]*\}\s*from\s*["']@libitums\/ui-lynx\/bottom-sheet["']/.test(
          text,
        ),
    )
    .map(({ path }) => path);
  expect(offenders).toEqual([]);
});
