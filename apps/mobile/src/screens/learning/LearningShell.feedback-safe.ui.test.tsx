import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { useCompactDevice } from "./compact-device.test-support";
import type { LearningShellFeedback } from "./learning-shell-props";

// `ui` 계층: 해설 판 면이 하단 안전 영역(홈 표시줄 자리)까지 칠해집니다(SH5). 판은 셸이 비운 아래 안전 영역만큼 음수
// 여백으로 내려가고, 판 안 마지막 자식인 바닥 상자가 같은 높이를 판정 면으로 채웁니다 — 내용 · 아래 버튼 자리는 그대로
// 입니다. 입력은 `lynx.__globalProps`(13 mini 대역), 관찰은 testid 요소의 인라인 style과 자식 순서입니다.

const restores: Array<() => void> = [];

afterEach(() => {
  cleanup();
  while (restores.length > 0) restores.pop()?.();
});

const feedback: LearningShellFeedback = {
  tone: "correct",
  title: "Nice reply!",
  lines: [{ text: "Answer a compliment with a thank you.", lang: "en" }],
};

function renderShell(tone: LearningShellFeedback["tone"] = "correct") {
  return render(
    <LearningShell
      form="word-choice"
      questionIndex={0}
      questionCount={1}
      instruction="What do you say?"
      onExit={() => {}}
      card={<text>card</text>}
      actionLabel="Continue"
      onAction={() => {}}
      feedback={{ ...feedback, tone }}
    />,
  );
}

test.each(["correct", "incorrect"] as const)(
  "SH5. 아래 안전 영역 34 → 판이 34 아래로 내려가고 판 안 마지막 자식 바닥 상자가 34를 채운다(%s)",
  (tone) => {
    // 13 mini — 창 812pt, 안전 영역 위 50 · 아래 34입니다.
    restores.push(useCompactDevice());
    renderShell(tone);

    const bleed = screen.getByTestId("learning-shell-feedback-bleed");
    expect(bleed.getAttribute("style")).toMatch(/margin-bottom:\s*-34px/);
    const panel = within(bleed).getByTestId("learning-shell-feedback");
    expect(panel).toHaveAttribute("data-tone", tone);
    const floor = within(panel).getByTestId("learning-shell-feedback-floor");
    expect(floor.getAttribute("style")).toMatch(/height:\s*34px/);
    expect(floor).toBeInTheDocument();
    // 바닥 상자는 판 안 맨 끝이고 버튼 행 뒤입니다 — 버튼은 안전 영역 위 지금 자리에 남습니다.
    const marked = Array.from(panel.querySelectorAll("[data-testid]"));
    expect(marked[marked.length - 1]).toBe(floor);
    const actions = screen.getByTestId("learning-shell-actions");
    expect(marked.indexOf(actions)).toBeGreaterThanOrEqual(0);
    expect(marked.indexOf(actions)).toBeLessThan(marked.indexOf(floor));
    expect(actions.contains(floor)).toBe(false);
  },
);

test("SH5. 아래 안전 영역이 없으면(0 · 값 없음) 바닥 상자가 없고 판은 내려가지 않는다", () => {
  renderShell();

  expect(screen.getByTestId("learning-shell-feedback-bleed").getAttribute("style")).toMatch(
    /margin-bottom:\s*0px/,
  );
  expect(screen.queryByTestId("learning-shell-feedback-floor")).not.toBeInTheDocument();
});

test("SH5. 바닥 상자는 줄지 않고 판의 줄 간격만큼 위로 붙어 내용 자리를 바꾸지 않는다", () => {
  const styles = readFileSync(resolve(import.meta.dirname, "learning-shell.css"), "utf8");
  expect(styles).toMatch(/\.learning-shell-feedback\s*\{[^}]*gap:\s*var\(--libitum-spacing-4\)/s);
  expect(styles).toMatch(
    /\.learning-shell-feedback-floor\s*\{[^}]*flex-shrink:\s*0[^}]*margin-top:\s*calc\(-1 \* var\(--libitum-spacing-4\)\)/s,
  );
  expect(styles).toMatch(/\.learning-shell-feedback-bleed\s*\{[^}]*flex-shrink:\s*0/s);
});
