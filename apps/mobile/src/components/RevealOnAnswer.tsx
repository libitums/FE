import { createContext, useContext, useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import {
  initialRevealState,
  revealContainerClassName,
  revealContainerStyle,
  revealFrameClassName,
  revealFrameStyle,
  revealItemClassName,
  revealReducer,
  revealTimerOf,
  type RevealEvent,
  type RevealPhase,
} from "./reveal-on-answer";

import "./reveal-on-answer.css";

export type RevealOnAnswerProps = {
  /** 답했거나(또는 처음부터 보이게 해 둔) 때 true — false면 아무것도 그리지 않습니다. */
  readonly shown: boolean;
  /** 안에 둔 `RevealOnAnswer.Item` 수 — 끝나는 시각이 마지막 글의 지연을 따릅니다. */
  readonly itemCount: number;
  readonly testId: string;
  readonly children: ReactNode;
};

export type RevealOnAnswerItemProps = {
  /** 나타나는 순서(0부터) — 120ms부터 60ms 간격으로 하나씩 섭니다. */
  readonly order: number;
  readonly children: ReactNode;
};

const PhaseContext = createContext<RevealPhase>("open");

// 답하면 흰 카드에 정답 · 대본이 붙어 카드가 커지는 자리의 공용 상자입니다(ADR-0212, 시안 C안).
//
// 단계와 시간은 순수 함수(`reveal-on-answer.ts`)가 정하고, 여기는 그것을 화면에 옮깁니다 — 보임이 바뀐 렌더에서 사건을
// 먹이고, 안쪽 상자의 `layoutchange`로 새 내용 높이를 한 번 재고, 단계마다 타이머 하나를 겁니다. 움직임은 전부 CSS 전환이라
// 매 프레임 스크립트가 돌지 않습니다(main-thread script를 쓰지 않은 이유 — ADR-0212 D4).
//
// **대본을 CSS로 숨기지 않고 렌더를 거르는 규칙은 그대로입니다.** 닫힘이면 상자째 문서에 없습니다.
function Root({ shown, itemCount, testId, children }: RevealOnAnswerProps): ReactNode {
  const motion = useMotion();
  const [state, setState] = useState(() => initialRevealState(shown));
  const previousShown = useRef(shown);
  const dispatch = (event: RevealEvent) => setState((current) => revealReducer(current, event));

  if (previousShown.current !== shown) {
    // oxlint-disable-next-line react/immutability -- ReactLynx useRef는 렌더 · effect에서 갱신하는 mutable ref입니다.
    previousShown.current = shown;
    setState(revealReducer(state, shown ? { type: "show", motion } : { type: "hide" }));
  }

  useEffect(() => {
    const timer = revealTimerOf(state.phase, itemCount);
    if (timer === null) return undefined;
    const id = setTimeout(() => dispatch(timer.event), timer.ms);
    return () => clearTimeout(id);
  }, [state.phase, itemCount]);

  if (state.phase === "closed") return null;
  const style = revealContainerStyle(state);
  const frame = revealFrameStyle(state);
  return (
    <view
      className={revealContainerClassName(state.phase)}
      data-testid={testId}
      data-phase={state.phase}
      {...(style === undefined ? {} : { style })}
    >
      <view
        className={revealFrameClassName(state.phase)}
        {...(frame === undefined ? {} : { style: frame })}
      >
        <view
          className="reveal-on-answer-content"
          data-testid={`${testId}-content`}
          bindlayoutchange={(event: { detail?: { height?: unknown } }) =>
            dispatch({ type: "measured", height: event.detail?.height })
          }
        >
          <PhaseContext.Provider value={state.phase}>{children}</PhaseContext.Provider>
        </view>
      </view>
    </view>
  );
}

function Item({ order, children }: RevealOnAnswerItemProps): ReactNode {
  const phase = useContext(PhaseContext);
  return <view className={revealItemClassName(phase, order)}>{children}</view>;
}

/** 답하면 펼쳐지는 상자(`RevealOnAnswer`)와 그 안에서 차례로 나타나는 글(`RevealOnAnswer.Item`)입니다. */
export const RevealOnAnswer = Object.assign(Root, { Item });
