import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { episodeFinalTestIds } from "./episode-final.contract";
import type { EpisodeFinalVisualNovelTest } from "./episode-final.contract";
import { EpisodeFinalScreen } from "./EpisodeFinalScreen";

// `ui` 계층: 상태바 아이콘 표지가 화면 루트에 달리는지 봅니다(계약 3.2 · r02.2).

afterEach(cleanup);

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

const finalTest: EpisodeFinalVisualNovelTest = {
  format: "visual-novel",
  unitId: "tutorial-final-test",
  questions: [
    {
      kind: "word-choice",
      id: "find",
      speakerName: "Me",
      before: "이 화장품 찾아",
      after: ".",
      translation: "Please help me find this cosmetic product.",
      options: ["오세요", "주세요", "있어요"],
      answerIndex: 1,
    },
  ],
};

test("UT4: 최종 테스트 화면의 루트에 표지가 하나 선다", () => {
  render(
    <EpisodeFinalScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 0."
      test={finalTest}
      onFinish={vi.fn()}
      onExit={vi.fn<() => void>()}
    />,
  );

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId(episodeFinalTestIds.screen));
});
