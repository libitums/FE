import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { PairMatchTile } from "./PairMatchTile";
import type { PairMatchTileProps, PairSide } from "./pair-match.contract";

// `ui` 계층: 짝 맞추기 타일 하나 — 받은 표식 · 번호 · 판정을 속성과 접근성 이름으로 그리고 눌림을 올립니다.
// 상태가 없는 조각이라 속성 조합마다 한 번씩 세워 봅니다.

afterEach(cleanup);

type OnTap = (side: PairSide, index: number) => void;

function mount(overrides: Partial<PairMatchTileProps> = {}) {
  const onTap = vi.fn<OnTap>();
  render(
    <PairMatchTile
      side="word"
      index={2}
      text="이름"
      mark="idle"
      pairOrdinal={null}
      partnerText={null}
      result={null}
      interaction="enabled"
      onTap={onTap}
      {...overrides}
    />,
  );
  return { onTap };
}

test("UPT1. 낱말 열 타일은 word 인덱스 testid와 idle 속성 · button trait · 글자 그대로의 낭독을 갖고 탭을 올린다", () => {
  const { onTap } = mount();

  const tile = screen.getByTestId("pair-match-word-2");
  expect(tile).toHaveAttribute("data-mark", "idle");
  expect(tile).toHaveAttribute("data-pair", "none");
  expect(tile).toHaveAttribute("data-result", "none");
  expect(tile).toHaveAttribute("accessibility-traits", "button");
  expect(tile).toHaveAttribute("accessibility-label", "이름");

  fireEvent.tap(tile, {});

  expect(onTap).toHaveBeenCalledTimes(1);
  expect(onTap).toHaveBeenCalledWith("word", 2);
});

test("UPT2. 뜻 열 타일은 meaning 인덱스 testid를 갖고 고른 표식이면 ', selected'를 덧붙여 읽는다", () => {
  const { onTap } = mount({ side: "meaning", index: 1, text: "name", mark: "selected" });

  const tile = screen.getByTestId("pair-match-meaning-1");
  expect(tile).toHaveAttribute("data-mark", "selected");
  expect(tile).toHaveAttribute("accessibility-label", "name, selected");

  fireEvent.tap(tile, {});
  expect(onTap).toHaveBeenCalledWith("meaning", 1);
});

test("UPT3. 맺힌 타일은 번호와 짝 글자를 읽고 번호 자리는 낭독에서 가려진다", () => {
  mount({ mark: "linked", pairOrdinal: 3, partnerText: "name" });

  const tile = screen.getByTestId("pair-match-word-2");
  expect(tile).toHaveAttribute("data-mark", "linked");
  expect(tile).toHaveAttribute("data-pair", "3");
  expect(tile).toHaveAttribute("accessibility-label", "이름, pair 3, matched with name");
  expect(tile.querySelector('[accessibility-elements-hidden="true"]')).not.toBeNull();
});

test.each([{ result: "correct" as const }, { result: "incorrect" as const }])(
  "UPT4. 확인 뒤 $result 판정은 data-result와 번호 없는 낭독 접미사로 드러난다",
  ({ result }) => {
    mount({ mark: "linked", pairOrdinal: 1, partnerText: "name", result });

    const tile = screen.getByTestId("pair-match-word-2");
    expect(tile).toHaveAttribute("data-result", result);
    expect(tile).toHaveAttribute(
      "accessibility-label",
      `이름, matched with name, ${uiCopyEn.common.answerResultSuffix[result]}`,
    );
  },
);

test("UPT5. 잠긴 타일은 disabled trait이고 탭을 올리지 않는다", () => {
  const { onTap } = mount({ interaction: "locked" });

  const tile = screen.getByTestId("pair-match-word-2");
  expect(tile).toHaveAttribute("accessibility-traits", "disabled");

  fireEvent.tap(tile, {});

  expect(onTap).toHaveBeenCalledTimes(0);
});
