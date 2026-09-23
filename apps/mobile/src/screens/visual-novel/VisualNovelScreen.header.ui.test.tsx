import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import type { SpecialUnitEntrySource } from "../../lib/special-unit-entry-source";
import { visualNovelStoryFor } from "./visual-novel";
import type { VisualNovelProgress, VisualNovelScreenProps } from "./visual-novel.contract";
import { VisualNovelScreen } from "./VisualNovelScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 머리 구조·접근성 시맨틱을 봅니다 (ADR-0006 D4).
// 나가기가 머리의 첫 흐름 자식이고, 제목·진행이 제목 묶음(`.visual-novel-header-text`,
// testid·접근성 속성 없음) 안으로 들어갑니다.
//
// 두 경로(여정·롤플레이)를 같은 케이스로 돕니다 — 구조는 진입 출처로 갈리지
// 않습니다. 기대 라벨은 `specialUnitExitLabel`의 결과로 비교합니다. 기존
// `VisualNovelScreen.ui.test.tsx`·`VisualNovelScreen.exit-label.ui.test.tsx`는 이
// 파일과 별도이고 한 글자도 고치지 않습니다.

const story = visualNovelStoryFor("cafe-arrival-visual-novel");

const sources: readonly SpecialUnitEntrySource[] = ["journey", "roleplay"];

const progresses: readonly VisualNovelProgress[] = [
  { status: "active", beatIndex: 0 },
  { status: "completed", beatIndex: 2 },
];

function renderScreen(source: SpecialUnitEntrySource, progress: VisualNovelProgress) {
  return render(
    <VisualNovelScreen
      story={story}
      progress={progress}
      exitLabel={specialUnitExitLabel(source)}
      onAdvance={vi.fn<VisualNovelScreenProps["onAdvance"]>()}
      onExit={vi.fn<VisualNovelScreenProps["onExit"]>()}
      onReplay={vi.fn<VisualNovelScreenProps["onReplay"]>()}
    />,
  );
}

describe("VisualNovelScreen 머리 구조", () => {
  describe("[VH1] 머리의 요소 자식이 정확히 둘 — 나가기 → 제목 묶음", () => {
    for (const source of sources) {
      for (const progress of progresses) {
        it(`경로=${source}, 진행=${progress.status}/${progress.beatIndex}`, () => {
          renderScreen(source, progress);

          const exit = screen.getByTestId("visual-novel-exit-button");
          const header = exit.parentElement;

          expect(header).toHaveClass("visual-novel-header");
          expect(header?.children).toHaveLength(2);
          expect(header?.children[0]).toBe(exit);
          expect(header?.children[1]).toHaveClass("visual-novel-header-text");
        });
      }
    }
  });

  describe("[VH2] 제목 묶음의 요소 자식이 정확히 둘 — 제목 → 진행, 접근성 속성 없음", () => {
    for (const source of sources) {
      it(`경로=${source}`, () => {
        renderScreen(source, { status: "active", beatIndex: 0 });

        // 묶음은 testid가 없으므로 parentElement로 찾습니다 — querySelector로 찾으면
        // 현재 구현에서 null이 나와 red가 단언 실패가 아니라 매처 오류로 보일 수
        // 있습니다.
        const title = screen.getByTestId("visual-novel-title");
        const progress = screen.getByTestId("visual-novel-progress");
        const bundle = title.parentElement;

        expect(bundle).toHaveClass("visual-novel-header-text");
        expect(bundle?.children).toHaveLength(2);
        expect(bundle?.children[0]).toBe(title);
        expect(bundle?.children[1]).toBe(progress);

        expect(bundle).not.toHaveAttribute("accessibility-element");
        expect(bundle).not.toHaveAttribute("accessibility-traits");
        expect(bundle).not.toHaveAttribute("accessibility-label");
        expect(bundle).not.toHaveAttribute("accessibility-elements-hidden");
      });
    }
  });

  describe("[VH3] 화면 루트의 요소 자식이 정확히 둘 — 머리 → 장면 셸", () => {
    for (const source of sources) {
      it(`경로=${source}`, () => {
        renderScreen(source, { status: "active", beatIndex: 0 });

        const root = screen.getByTestId("visual-novel-screen");
        expect(root.children).toHaveLength(2);
        expect(root.children[0]).toHaveClass("visual-novel-header");
        expect(root.children[1]).toHaveClass("visual-novel-scene-shell");

        // 나가기는 더 이상 루트의 직계 자식이 아닙니다.
        const exit = screen.getByTestId("visual-novel-exit-button");
        expect(exit.parentElement).not.toBe(root);
      });
    }
  });

  // VH4 — 불변 조건, 회귀 방지입니다(현재 구현이 이미 만족해야 합니다. red면 테스트
  // 결함입니다).
  describe("[VH4] 접근성 시맨틱 불변", () => {
    for (const source of sources) {
      it(`경로=${source}`, () => {
        const { container } = renderScreen(source, { status: "active", beatIndex: 0 });

        const label = specialUnitExitLabel(source);
        const exit = screen.getByTestId("visual-novel-exit-button");
        expect(exit).toHaveAttribute("accessibility-element", "true");
        expect(exit).toHaveAttribute("accessibility-traits", "button");
        expect(exit).toHaveAttribute("accessibility-label", label);
        expect(exit).toHaveTextContent(label);

        const innerText = exit.querySelector("text");
        expect(innerText).not.toBeNull();
        expect(innerText).toHaveAttribute("accessibility-element", "false");

        const headers = container.querySelectorAll('[accessibility-traits="header"]');
        expect(headers).toHaveLength(1);
        expect(headers[0]).toBe(screen.getByTestId("visual-novel-title"));
      });
    }
  });
});
