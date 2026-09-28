import type { ReactNode } from "@lynx-js/react";

import type { MessengerChoicesProps } from "./messenger.contract";

import "./messenger-choices.css";

// 객관식 보기입니다(Figma 80-7380) — 자판 자리에 어두운 버튼 넷이 섭니다. 고르면 그 문장이
// 입력창에 서고, 보내기로 채점합니다. 고른 보기는 주색 면으로 갈립니다.
export function MessengerChoices({ choices, chosen, onChoose }: MessengerChoicesProps): ReactNode {
  return (
    <view className="messenger-choices" data-testid="messenger-choices">
      {choices.map((choice) => {
        const selected = choice === chosen;
        return (
          <view
            key={choice}
            className={selected ? "messenger-choice messenger-choice-selected" : "messenger-choice"}
            data-testid={`messenger-choice-${choice}`}
            data-selected={selected ? "true" : "false"}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={selected ? `${choice}, 선택됨` : choice}
            bindtap={() => onChoose(choice)}
          >
            <text className="messenger-choice-label">{choice}</text>
          </view>
        );
      })}
    </view>
  );
}
