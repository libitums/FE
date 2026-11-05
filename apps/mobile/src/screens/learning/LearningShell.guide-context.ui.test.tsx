import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { LearningGuideObscuredContext } from "./learning-guide-obscured";

// `ui` 계층: 활동 안내 층(ADR-0104 D3)이 컨텍스트로 알린 「덮임」을 껍데기 루트가 낭독 가림으로 옮긴다.
// 화면마다 `obscured`를 넘기지 않아도 되게 하는 길입니다. 직접 넘긴 `obscured={true}`는 언제나 이깁니다.

afterEach(cleanup);

function shell(context: boolean | undefined, obscured?: boolean) {
  return (
    <LearningGuideObscuredContext.Provider value={context}>
      <LearningShell
        form="listening"
        questionIndex={0}
        questionCount={1}
        instruction="대화를 완성하세요"
        onExit={() => {}}
        card={<text>카드 안</text>}
        {...(obscured === undefined ? {} : { obscured })}
      />
    </LearningGuideObscuredContext.Provider>
  );
}

const root = () => screen.getByTestId("learning-shell");

test("[GC1] 층이 덮였다(true)면 루트가 가려지고, 닫히면(false) false가 쓰인다", () => {
  const view = render(shell(true));
  expect(root()).toHaveAttribute("accessibility-elements-hidden", "true");

  view.rerender(shell(false));
  expect(root()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[GC2] 층 밖(undefined)이고 obscured도 없으면 속성이 없다", () => {
  render(shell(undefined));
  expect(root()).not.toHaveAttribute("accessibility-elements-hidden");
});

test("[GC3] 화면이 넘긴 obscured={true}는 층이 false여도 가린다", () => {
  render(shell(false, true));
  expect(root()).toHaveAttribute("accessibility-elements-hidden", "true");
});

test("[GC4] 화면이 obscured={false}를 넘겨도 층이 덮였으면(true) 가리고, 층이 닫히면 false다", () => {
  // 문장 만들기 화면은 자기 안내가 없을 때 늘 false를 넘깁니다 — 조각 둘 이상인 첫 활동이 이 경우입니다.
  const view = render(shell(true, false));
  expect(root()).toHaveAttribute("accessibility-elements-hidden", "true");

  view.rerender(shell(false, false));
  expect(root()).toHaveAttribute("accessibility-elements-hidden", "false");
});
