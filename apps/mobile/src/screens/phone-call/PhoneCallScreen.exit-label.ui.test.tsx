import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

const audio = vi.hoisted(() => ({ playAudio: vi.fn(), stopAudio: vi.fn() }));
vi.mock("../../lib/audio", () => audio);

import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import type { PhoneCallConversation } from "./phone-call.contract";
import { PhoneCallScreen } from "./PhoneCallScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 나가기 라벨 상호작용을 본다 (ADR-0006 D4).
// 기존 전화 ui 테스트처럼 `../../lib/audio`를 mock한다(계획 ui 절).
//
// 계약: .agent-harness/work/lib-255/spec.md §2.7 「세 화면 …변경」 · §4.3 「나가기」.
// 계획: .agent-harness/work/lib-255/test-plan.md ui § `*.exit-label.ui.test.tsx` X1~X4.
//
// 기존 `PhoneCallScreen.ui.test.tsx`는 이 파일과 별도이고 한 글자도 고치지 않는다
// (수용 기준 4) — 이 파일은 `exitLabel` prop만 다룬다.

const conversation: PhoneCallConversation = {
  unitId: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
  turns: [
    {
      id: "confirm-time",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
      audioSource: "phone-call-confirm-01",
      reply: { id: "confirm-time-reply", text: "네, 토요일 오후 2시에 만나요." },
    },
    {
      id: "confirm-place",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
      audioSource: "phone-call-confirm-02",
      reply: { id: "confirm-place-reply", text: "네, 2번 출구 오른쪽 카페예요." },
    },
    {
      id: "goodbye",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "좋아요. 그럼 토요일에 봐요!",
      audioSource: "phone-call-confirm-03",
      reply: { id: "goodbye-reply", text: "네, 토요일에 봐요!" },
    },
  ],
};

describe("PhoneCallScreen 나가기 라벨 (LIB-255)", () => {
  beforeEach(() => vi.resetAllMocks());

  // X1
  it("[X1] exitLabel=목록으로(roleplay) → 나가기 텍스트·accessibility-label이 목록으로다", () => {
    render(
      <PhoneCallScreen
        unitId={conversation.unitId}
        conversation={conversation}
        completionStatus="available"
        exitLabel={specialUnitExitLabel("roleplay")}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("phone-call-exit-button");
    expect(exit).toHaveTextContent("목록으로");
    expect(exit).toHaveAttribute("accessibility-label", "목록으로");
    expect(exit).toHaveAttribute("accessibility-traits", "button");
    expect(exit).toHaveAttribute("accessibility-element", "true");
  });

  // X2
  it("[X2] 목록으로 상태에서 나가기 tap → onExit가 기존과 같은 인자('incomplete')로 정확히 1회", () => {
    const onExit = vi.fn();
    render(
      <PhoneCallScreen
        unitId={conversation.unitId}
        conversation={conversation}
        completionStatus="available"
        exitLabel={specialUnitExitLabel("roleplay")}
        onComplete={vi.fn()}
        onExit={onExit}
      />,
    );

    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith("incomplete");
  });

  // X3
  it("[X3] exitLabel=맵으로(journey) → 나가기 텍스트·accessibility-label이 맵으로다", () => {
    render(
      <PhoneCallScreen
        unitId={conversation.unitId}
        conversation={conversation}
        completionStatus="available"
        exitLabel={specialUnitExitLabel("journey")}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("phone-call-exit-button");
    expect(exit).toHaveTextContent("맵으로");
    expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  });

  // X4
  it("[X4] exitLabel 생략 → 기본값 맵으로", () => {
    render(
      <PhoneCallScreen
        unitId={conversation.unitId}
        conversation={conversation}
        completionStatus="available"
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("phone-call-exit-button");
    expect(exit).toHaveTextContent("맵으로");
    expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  });
});
