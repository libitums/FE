import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import type { MessengerConversation } from "./messenger.contract";
import { MessengerScreen } from "./MessengerScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 나가기 라벨 상호작용을 본다 (ADR-0006 D4).
//
// 계약: .agent-harness/work/lib-255/spec.md §2.7 「세 화면 …변경」 · §4.3 「나가기」.
// 계획: .agent-harness/work/lib-255/test-plan.md ui § `*.exit-label.ui.test.tsx` X1~X4.
//
// 기존 `messenger-components.ui.test.tsx` · `messenger-accessibility.ui.test.tsx`는
// 이 파일과 별도이고 한 글자도 고치지 않는다(수용 기준 4) — 이 파일은 `exitLabel` prop만
// 다룬다.

const conversation: MessengerConversation = {
  id: "appointment-confirmation",
  title: "약속 확인 메시지",
  participantName: "지민",
  messages: [
    { id: "jimin-schedule", sender: "jimin", text: "토요일 오후 2시에 역 앞 카페에서 만나요." },
    { id: "self-accept", sender: "self", text: "네, 좋아요. 토요일에 봬요!" },
    { id: "jimin-directions", sender: "jimin", text: "카페는 2번 출구 오른쪽에 있어요." },
    { id: "self-thanks", sender: "self", text: "네, 고마워요!" },
    { id: "jimin-goodbye", sender: "jimin", text: "그럼 토요일에 봬요!" },
  ],
};

describe("MessengerScreen 나가기 라벨 (LIB-255)", () => {
  // X1
  it("[X1] exitLabel=목록으로(roleplay) → 나가기 텍스트·accessibility-label이 목록으로다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        exitLabel={specialUnitExitLabel("roleplay")}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("messenger-screen-exit");
    expect(exit).toHaveTextContent("목록으로");
    expect(exit).toHaveAttribute("accessibility-label", "목록으로");
    expect(exit).toHaveAttribute("accessibility-traits", "button");
    expect(exit).toHaveAttribute("accessibility-element", "true");
  });

  // X2
  it("[X2] 목록으로 상태에서 나가기 tap → onExit가 기존과 같은 인자('incomplete')로 정확히 1회", () => {
    const onExit = vi.fn();
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        exitLabel={specialUnitExitLabel("roleplay")}
        onExit={onExit}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith("incomplete");
  });

  // X3
  it("[X3] exitLabel=맵으로(journey) → 나가기 텍스트·accessibility-label이 맵으로다", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        exitLabel={specialUnitExitLabel("journey")}
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("messenger-screen-exit");
    expect(exit).toHaveTextContent("맵으로");
    expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  });

  // X4
  it("[X4] exitLabel 생략 → 기본값 맵으로", () => {
    render(
      <MessengerScreen
        conversation={conversation}
        completionStatus="available"
        onExit={vi.fn()}
        onComplete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("messenger-screen-exit");
    expect(exit).toHaveTextContent("맵으로");
    expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  });
});
