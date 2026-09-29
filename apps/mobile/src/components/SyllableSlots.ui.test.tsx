import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

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
test("[SS2] 줄의 낭독 이름이 몇째 칸을 쓰는지와 쓴 글자를 말한다", () => {
  render(<SyllableSlots syllables={["가", "나", "다"]} currentIndex={1} />);

  const row = screen.getByTestId("syllable-slots");
  expect(row).toHaveAttribute("accessibility-element", "true");
  expect(row).toHaveAttribute("accessibility-label", "쓸 글자 3칸 중 2번째, 나, 쓴 글자 가");
});

test("[SS3] 다 쓰면 모든 칸이 done이고 이름이 모두 썼다고 말한다", () => {
  render(<SyllableSlots syllables={["가", "나"]} currentIndex={2} />);

  expect(screen.getByTestId("syllable-slots-slot-1")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("syllable-slots")).toHaveAttribute(
    "accessibility-label",
    "쓸 글자 2칸, 모두 씀, 가나",
  );
});
