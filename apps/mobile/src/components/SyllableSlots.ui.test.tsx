import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";
import { SyllableSlots } from "./SyllableSlots";

// `ui` 계층: 렌더 결과만 봅니다 (ADR-0006 D4). 음절은 이 파일의 대역입니다.

// SS1 — 쓴 칸 · 지금 칸은 음절을 보이고, 아직 안 쓴 칸은 비어 있습니다.
test("[SS1] 순번 앞은 done, 순번 자리는 current, 뒤는 locked이고 locked 칸만 비어 있다", () => {
  render(<SyllableSlots syllables={["가", "나", "다"]} currentIndex={1} />);

  expect(screen.getByTestId("syllable-slots-slot-0")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("syllable-slots-slot-0").textContent).toBe("가");
  expect(screen.getByTestId("syllable-slots-slot-1")).toHaveAttribute("data-status", "current");
  expect(screen.getByTestId("syllable-slots-slot-1").textContent).toBe("나");
  expect(screen.getByTestId("syllable-slots-slot-2")).toHaveAttribute("data-status", "locked");
  expect(screen.getByTestId("syllable-slots-slot-2").textContent).toBe("");
});

// SS2 — 줄 하나가 한 접근성 요소이고, 안 쓴 칸의 글자는 읽지 않습니다.
test("[SH5-E][SS2] 줄의 낭독 이름이 몇째 칸을 쓰는지와 쓴 글자를 말한다", () => {
  render(<SyllableSlots syllables={["가", "나", "다"]} currentIndex={1} />);

  const row = screen.getByTestId("syllable-slots");
  expect(row).toHaveAttribute("accessibility-element", "true");
  expect(row).toHaveAttribute("accessibility-label", "Letter 2 of 3, 나, written 가");
});

test("[SH5-E][SS3] 다 쓰면 모든 칸이 done이고 이름이 모두 썼다고 말한다", () => {
  render(<SyllableSlots syllables={["가", "나"]} currentIndex={2} />);

  expect(screen.getByTestId("syllable-slots-slot-1")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("syllable-slots")).toHaveAttribute(
    "accessibility-label",
    "2 letters to write, all written, 가나",
  );
});

test("[SH5-E] 첫 칸은 쓴 글자 없이 Letter 1 of 3이라고만 말한다", () => {
  render(<SyllableSlots syllables={["가", "나", "다"]} currentIndex={0} />);

  expect(screen.getByTestId("syllable-slots")).toHaveAttribute(
    "accessibility-label",
    "Letter 1 of 3, 가",
  );
});

test("[SH5-E] 한 글자짜리 줄이 다 쓰이면 letter를 단수로 말한다", () => {
  render(<SyllableSlots syllables={["가"]} currentIndex={1} />);

  expect(screen.getByTestId("syllable-slots")).toHaveAttribute(
    "accessibility-label",
    "1 letter to write, all written, 가",
  );
});

test("[SH5-M] 문구표를 주입하면 줄의 이름이 표의 경로(인자 포함)로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <SyllableSlots syllables={["가", "나", "다"]} currentIndex={1} />
    </UiCopyContext.Provider>,
  );
  expect(screen.getByTestId("syllable-slots")).toHaveAttribute(
    "accessibility-label",
    "⟦writing.slotsCurrent⟧(3, 2, 나, 가)",
  );
});

test("[SH5-M] 문구표를 주입하면 다 쓴 줄의 이름이 slotsAllWritten 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <SyllableSlots syllables={["가", "나"]} currentIndex={2} />
    </UiCopyContext.Provider>,
  );
  expect(screen.getByTestId("syllable-slots")).toHaveAttribute(
    "accessibility-label",
    "⟦writing.slotsAllWritten⟧(2, 가나)",
  );
});
