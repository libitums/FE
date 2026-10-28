import { expect, test, vi } from "vitest";

import type { CatalogLessonWiring } from "./catalog-lesson-wiring";
import { withCatalogStory } from "./catalog-story-wiring";
import type { CatalogStoryWiringArgs } from "./catalog-story-wiring";
import type { NavAction } from "./nav-state";

// `unit` 계층: 막간 이야기의 나가는 길. 이야기는 결과 화면의 「Next lesson」 위에 쌓일 수 있어서(push), 끝내기 ·
// 건너뛰기 · 나가기가 한 칸만 돌아가면(`back`) 같은 INT를 가리키는 결과 화면이 다시 서고 그 버튼이 같은 이야기를
// 또 엽니다(무한 반복). 그래서 셋 다 쌓인 화면을 걷고 지도(탭 루트)로 갑니다(`backToRoot`).

function wiring() {
  const dispatch = vi.fn<(action: NavAction) => void>();
  const args = {
    episodeContent: { catalog: [] },
    catalogSections: [],
    catalogProgress: {},
    setCatalogProgress: vi.fn(),
    dispatch,
    episodeIntroEventSink: null,
    learnerFill: {},
  } as unknown as CatalogStoryWiringArgs;
  return { story: withCatalogStory({} as unknown as CatalogLessonWiring, args), dispatch };
}

test("SW1. 이야기를 끝내면(배너가 닫힘) 지도로 간다 — 결과 화면으로 한 칸만 돌아가지 않는다", () => {
  const { story, dispatch } = wiring();
  story.onFinishCatalogStory("u01", "INT");
  expect(dispatch).toHaveBeenCalledWith({ type: "backToRoot" });
  expect(dispatch).not.toHaveBeenCalledWith({ type: "back" });
});

test("SW2. 건너뛰기 · 나가기도 지도로 간다", () => {
  const skip = wiring();
  skip.story.onSkipCatalogStory("u01", "INT");
  expect(skip.dispatch).toHaveBeenCalledWith({ type: "backToRoot" });
  const exit = wiring();
  exit.story.onExitCatalogStory("u01", "INT", "story");
  expect(exit.dispatch).toHaveBeenCalledWith({ type: "backToRoot" });
});
