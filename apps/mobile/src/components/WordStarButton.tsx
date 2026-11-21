import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import fivePointedStar from "@libitums/icons/lynx/five-pointed-star";

import { useUiCopy } from "../lib/ui-copy";
import { starOutlineIcon } from "./star-outline-icon";

import "./word-star-button.css";

export type WordStarButtonProps = {
  /** 낭독 이름에 넣을 단어(한국어). */
  readonly word: string;
  readonly starred: boolean;
  /** 누름 — 바뀐 뒤 값. */
  readonly onToggle: (starred: boolean) => void;
  readonly testId: string;
};

// 단어 별(즐겨찾기) 단추입니다(ADR-0169 즐겨찾기 개정) — 레슨 단어 카드와 My words 줄이 같이 씁니다. 누르는 자리 44 × 44 안에 22 별.
// 켜짐 = 채운 별 brand-primary, 꺼짐 = 외곽선 별 fg-neutral-muted — 색과 모양이 함께 바뀝니다. 상태는 이름 꼬리 「selected」로
// 싣습니다(ADR-0016 D3 — traits는 값 하나라 button과 selected를 함께 담지 못함).
export function WordStarButton({
  word,
  starred,
  onToggle,
  testId,
}: WordStarButtonProps): ReactNode {
  const uiCopy = useUiCopy();
  const name = uiCopy.more.wordbook.star(word);
  return (
    <view
      className="word-star-button"
      data-testid={testId}
      data-starred={starred ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={starred ? uiCopy.common.selected(name) : name}
      accessibility-traits="button"
      flatten={false}
      bindtap={() => {
        "background only";
        onToggle(!starred);
      }}
    >
      <svg
        className="word-star-button-icon"
        content={starred ? fivePointedStar : starOutlineIcon}
        current-color={starred ? color.brand.primary : color.fg["neutral-muted"]}
      />
    </view>
  );
}
