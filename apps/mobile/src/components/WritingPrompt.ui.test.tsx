import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";
import { WritingPrompt } from "./WritingPrompt";
import { writingPassCriterion } from "../lib/writing-judge";

// `ui` 계층: 렌더 결과만 봅니다 (ADR-0006 D4). 문항은 이 파일의 대역입니다.

// WP1 — 빈칸은 음절 수만큼의 밑줄이고, 보조기술은 밑줄 대신 문구표의 blank를 읽습니다.
test("[WP1] 빈칸 문장을 밑줄로 보이고 낭독 이름은 blank로 읽힌다", () => {
  render(
    <WritingPrompt
      question={{
        id: "q",
        before: "역이 ",
        syllables: ["어", "디"],
        after: "예요?",
        translation: "Where is the station?",
        passCriterion: writingPassCriterion,
      }}
      tone="plain"
    />,
  );

  const prompt = screen.getByTestId("writing-prompt");
  expect(prompt.textContent).toBe("역이 _ _예요?");
  expect(prompt).toHaveAttribute("accessibility-label", "역이, blank, 예요?");
});

test("[WP1-M] 문구표를 주입하면 낭독 이름의 빈칸 자리가 common.blank 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <WritingPrompt
        question={{
          id: "q",
          before: "역이 ",
          syllables: ["어", "디"],
          after: "예요?",
          translation: "Where is the station?",
          passCriterion: writingPassCriterion,
        }}
        tone="plain"
      />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("writing-prompt")).toHaveAttribute(
    "accessibility-label",
    "역이, ⟦common.blank⟧, 예요?",
  );
});
