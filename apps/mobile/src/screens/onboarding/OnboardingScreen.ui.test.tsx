import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { onboardingAutoAdvanceMs } from "./onboarding";
import { OnboardingScreen } from "./OnboardingScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 스텝 진행(밀기 · 자동 넘김)·진행 점·시작 버튼을 봅니다
// (ADR-0006 D4, ADR-0159). `step`은 화면 로컬 상태입니다 — 전이 없이 이 컴포넌트 안에서만 돕니다.
//
// 제목·본문(`onboardingCopy`의 결과)은 자리표입니다 — 공백 아님·서로 다름만 봅니다.

// 시작 버튼은 `onboarding-screen-start` 행 안의 ui-lynx Button입니다 — 모든 스텝에 같습니다.
function actionButton() {
  return within(screen.getByTestId("onboarding-screen-start")).getByTestId("ui-lynx-button");
}

// 카드 영역을 왼쪽으로 밀어 다음 스텝으로 갑니다.
function next() {
  const pager = screen.getByTestId("onboarding-screen-pager");
  fireEvent.touchstart(pager, { touches: [{ pageX: 300, pageY: 200 }] });
  fireEvent.touchmove(pager, { touches: [{ pageX: 220, pageY: 204 }] });
}

function swipeBack() {
  const pager = screen.getByTestId("onboarding-screen-pager");
  fireEvent.touchstart(pager, { touches: [{ pageX: 100, pageY: 200 }] });
  fireEvent.touchmove(pager, { touches: [{ pageX: 180, pageY: 204 }] });
}

describe("OnboardingScreen", () => {
  // OB-U1 — 스크롤 상자에 accessibility-*가 0건임을 얹습니다(SP1과 같은 형태입니다).
  it("[OB-U1] 첫 렌더가 data-step='0'이고 그 스텝의 제목·본문이 공백이 아니다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);

    const root = screen.getByTestId("onboarding-screen");
    expect(root).toHaveAttribute("data-step", "0");

    const title = screen.getByTestId("onboarding-screen-title");
    const body = screen.getByTestId("onboarding-screen-body");
    expect(title.textContent?.trim()).not.toBe("");
    expect(body.textContent?.trim()).not.toBe("");

    const scroll = screen.getByTestId("onboarding-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  it("[OB-U2] 액션을 누르면 data-step이 0→1→2로 간다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);
    const root = screen.getByTestId("onboarding-screen");

    expect(root).toHaveAttribute("data-step", "0");
    next();
    expect(root).toHaveAttribute("data-step", "1");
    next();
    expect(root).toHaveAttribute("data-step", "2");
  });

  it("[OB-U3] 스텝이 바뀌면 같은 testid의 제목·본문 텍스트가 바뀐다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);

    const titleBefore = screen.getByTestId("onboarding-screen-title").textContent;
    const bodyBefore = screen.getByTestId("onboarding-screen-body").textContent;

    next();

    const titleAfter = screen.getByTestId("onboarding-screen-title").textContent;
    const bodyAfter = screen.getByTestId("onboarding-screen-body").textContent;

    expect(titleAfter).not.toBe(titleBefore);
    expect(bodyAfter).not.toBe(bodyBefore);
  });

  it("[OB-U4] 페이지 표시의 현재 페이지가 스텝을 따라 옮겨 간다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);

    function currentPage(): string | null {
      return within(screen.getByTestId("onboarding-screen-progress"))
        .getByTestId("ui-lynx-page-indicator")
        .getAttribute("data-current");
    }

    expect(currentPage()).toBe("1");
    next();
    expect(currentPage()).toBe("2");
    next();
    expect(currentPage()).toBe("3");
  });

  it("[OB-U5] 어느 스텝에서든 Get started를 누르면 곧바로 onComplete 1회다", () => {
    const first = vi.fn();
    render(<OnboardingScreen onComplete={first} />);
    fireEvent.tap(actionButton(), {});
    expect(first).toHaveBeenCalledTimes(1);
  });

  it("[OB-U6] 버튼 문구가 모든 스텝에서 Get started이고, 오른쪽으로 밀면 한 칸 돌아간다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);
    const action = screen.getByTestId("onboarding-screen-start");
    const root = screen.getByTestId("onboarding-screen");

    expect(action).toHaveTextContent(uiCopyEn.onboarding.getStarted);
    next();
    expect(action).toHaveTextContent(uiCopyEn.onboarding.getStarted);
    next();
    expect(action).toHaveTextContent(uiCopyEn.onboarding.getStarted);
    next(); // 마지막에서 더 밀어도 그대로입니다(돌지 않음).
    expect(root).toHaveAttribute("data-step", "2");
    swipeBack();
    expect(root).toHaveAttribute("data-step", "1");
  });

  // OB-U7 — 진행 래퍼에 이름 있는 accessibility-element가 실재하고, 그 이름이
  // 스텝을 따라 갈립니다(리터럴을 박지 않습니다 — 문구가 바뀌어도 안 깨집니다).
  // getByTestId("onboarding-screen-progress")가 존재 앵커입니다 — 래퍼가 없으면
  // 여기서 먼저 TestingLibraryElementError로 죽습니다. 같은 케이스에서 액션 행이
  // element+label+traits="button" 셋을 함께 갖는다도 겁니다(오늘 그 조합을 함께
  // 보는 자리가 없습니다).
  it("[OB-U7] 진행 래퍼가 accessibility-element이고 이름이 스텝마다 갈린다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);

    const progress = screen.getByTestId("onboarding-screen-progress");
    expect(progress).toHaveAttribute("accessibility-element", "true");
    const nameAtStep0 = progress.getAttribute("accessibility-label");

    const action = actionButton();
    expect(action).toHaveAttribute("accessibility-element", "true");
    expect(action).toHaveAttribute("accessibility-label", uiCopyEn.onboarding.getStarted);
    expect(action).toHaveAttribute("accessibility-traits", "button");

    next();

    const nameAtStep1 = progress.getAttribute("accessibility-label");
    expect(nameAtStep1).not.toBe(nameAtStep0);
  });

  // OB-U8 — 2026-09-21 디자인 반영: 좌상단 뒤로가기입니다.
  it("[OB-U8] 첫 스텝에는 뒤로가기가 없고, 다음 스텝부터 누르면 한 칸 돌아간다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);
    const root = screen.getByTestId("onboarding-screen");
    const header = screen.getByTestId("onboarding-screen-header");

    expect(within(header).queryByTestId("ui-lynx-round-button")).toBeNull();

    next();
    const back = within(header).getByTestId("ui-lynx-round-button");
    expect(back).toHaveAttribute("accessibility-label", "Back");

    fireEvent.tap(back, {});
    expect(root).toHaveAttribute("data-step", "0");
    expect(within(header).queryByTestId("ui-lynx-round-button")).toBeNull();
  });

  // OB-U9 — 2026-09-21 디자인 반영: 둘째 스텝 듣기 카드의 글자 칠하기입니다.
  it("[OB-U9] 재생하면 표현이 한 글자씩 칠해지고 끝나면 멈추며, 다시 듣기는 처음부터 칠한다", () => {
    vi.useFakeTimers();
    try {
      render(<OnboardingScreen onComplete={vi.fn()} />);
      next(); // 0 → 1

      const roundButton = (label: string) =>
        screen
          .getAllByTestId("ui-lynx-round-button")
          .find((button) => button.getAttribute("accessibility-label") === label)!;
      const filled = () =>
        screen.getByTestId("onboarding-screen-quiz-text").getAttribute("data-filled");

      expect(filled()).toBe("0");
      fireEvent.tap(roundButton("Play"), {});
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(filled()).toBe("1");

      // 자동 넘김(4초)보다 짧게 — 재생(8칸 × 350ms)이 끝나고도 한 칸 남게 둡니다.
      act(() => {
        vi.advanceTimersByTime(350 * 9);
      });
      // "선크림 있어요?" — 띄어쓰기·물음표까지 8칸.
      expect(filled()).toBe("8");
      expect(roundButton("Play")).toBeDefined();

      fireEvent.tap(roundButton("Replay"), {});
      expect(filled()).toBe("0");
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(filled()).toBe("1");
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U10 — 셋째 스텝 카드 안은 ui-lynx `LearningUnit`입니다. active → clear로 바뀝니다.
  it("[OB-U10] 셋째 스텝의 학습 유닛이 학습 중으로 보이다가 잠시 뒤 완료로 바뀐다", () => {
    vi.useFakeTimers();
    try {
      render(<OnboardingScreen onComplete={vi.fn()} />);
      next(); // 0 → 1
      next(); // 1 → 2

      const unit = () =>
        within(screen.getByTestId("onboarding-screen-unit")).getByTestId(
          "ui-lynx-learning-unit-onboarding",
        );
      expect(unit()).toHaveAttribute("data-status", "active");

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(unit()).toHaveAttribute("data-status", "clear");
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U11 — 장식 그림(배경·튀어나온 인물)이 이름 없는 접근성 정지로 남지 않습니다.
  it("[OB-U11] 첫 스텝 그림 카드는 래퍼가 접근성 자손을 통째로 가린다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);
    const hero = screen.getByTestId("onboarding-screen-hero");
    expect(hero).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(hero.querySelectorAll("image").length).toBeGreaterThan(0);
  });

  // OB-U12 — 화면 문구가 영어라 보조기술 이름도 영어로 맞춥니다.
  it("[OB-U12] 진행 표시·학습 유닛 상태의 보조기술 이름이 화면 문구와 같은 영어다", () => {
    vi.useFakeTimers();
    try {
      render(<OnboardingScreen onComplete={vi.fn()} />);
      expect(screen.getByTestId("onboarding-screen-progress")).toHaveAttribute(
        "accessibility-label",
        "Step 1 of 3",
      );
      expect(screen.getByTestId("ui-lynx-page-indicator")).toHaveAttribute(
        "accessibility-element",
        "false",
      );
      next();
      next();
      // 표식(`LearningUnit`)은 버튼 · 한국어 접미사로 낭독되므로 가립니다.
      expect(
        within(screen.getByTestId("onboarding-screen-unit"))
          .getByTestId("ui-lynx-learning-unit-onboarding")
          .closest("[accessibility-elements-hidden]"),
      ).not.toBeNull();
      const content = () => screen.getByTestId("onboarding-screen-unit-content");
      expect(content()).toHaveAttribute(
        "accessibility-label",
        "Shopping at a beauty store, Learning",
      );
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(content()).toHaveAttribute("accessibility-label", "Shopping at a beauty store, Clear");
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U13 — 재생 중에 스텝을 떠나면 재생·칠하기가 멈추고 초기화됩니다.
  it("[OB-U13] 재생 중에 다른 스텝으로 갔다 돌아오면 재생이 멈춰 있고 칠하기가 처음부터다", () => {
    vi.useFakeTimers();
    try {
      render(<OnboardingScreen onComplete={vi.fn()} />);
      next(); // 0 → 1

      const roundButton = (label: string) =>
        screen
          .getAllByTestId("ui-lynx-round-button")
          .find((button) => button.getAttribute("accessibility-label") === label);
      const filled = () =>
        screen.getByTestId("onboarding-screen-quiz-text").getAttribute("data-filled");

      fireEvent.tap(roundButton("Play")!, {});
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(filled()).toBe("1");

      next(); // 1 → 2 (재생 중에 떠납니다)
      act(() => {
        vi.advanceTimersByTime(350 * 3);
      });
      fireEvent.tap(roundButton("Back")!, {}); // 2 → 1

      expect(filled()).toBe("0");
      expect(roundButton("Play")).toBeDefined();
      expect(roundButton("Stop")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U14 — 손대지 않으면 스텝이 스스로 넘어가고 마지막에서 멈춥니다(ADR-0159).
  it("[OB-U14] 손대지 않으면 일정 시간마다 다음 스텝으로 가고, 마지막에서 멈추며 onComplete는 0회다", () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      render(<OnboardingScreen onComplete={onComplete} />);
      const root = screen.getByTestId("onboarding-screen");
      act(() => {
        vi.advanceTimersByTime(onboardingAutoAdvanceMs - 100);
      });
      expect(root).toHaveAttribute("data-step", "0");
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(root).toHaveAttribute("data-step", "1");
      act(() => {
        vi.advanceTimersByTime(onboardingAutoAdvanceMs * 3);
      });
      expect(root).toHaveAttribute("data-step", "2");
      expect(onComplete).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U15 — 손이 닿으면 자동 넘김 시계가 처음부터 다시 셉니다.
  it("[OB-U15] 화면에 손이 닿으면 자동 넘김을 처음부터 다시 센다", () => {
    vi.useFakeTimers();
    try {
      render(<OnboardingScreen onComplete={vi.fn()} />);
      const root = screen.getByTestId("onboarding-screen");
      act(() => {
        vi.advanceTimersByTime(onboardingAutoAdvanceMs - 500);
      });
      fireEvent.touchstart(screen.getByTestId("onboarding-screen-pager"), {
        touches: [{ pageX: 100, pageY: 100 }],
      });
      act(() => {
        vi.advanceTimersByTime(onboardingAutoAdvanceMs - 500);
      });
      expect(root).toHaveAttribute("data-step", "0");
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(root).toHaveAttribute("data-step", "1");
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U16 — 동작 줄이기를 켠 사람에게는 스스로 넘기지 않습니다(밀기는 그대로).
  it("[OB-U16] 동작 줄이기면 자동으로 넘어가지 않고 밀기로만 간다", () => {
    vi.useFakeTimers();
    try {
      render(
        <MotionProvider motion="reduced">
          <OnboardingScreen onComplete={vi.fn()} />
        </MotionProvider>,
      );
      const root = screen.getByTestId("onboarding-screen");
      act(() => {
        vi.advanceTimersByTime(onboardingAutoAdvanceMs * 3);
      });
      expect(root).toHaveAttribute("data-step", "0");
      next();
      expect(root).toHaveAttribute("data-step", "1");
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U17 — 스텝 열람(처음 보인 때 한 번)과 시작 이벤트(ADR-0159).
  it("[OB-U17] 스텝마다 처음 보일 때 한 번 열람을, Get started에 시작을 낸다", () => {
    vi.useFakeTimers();
    try {
      const events: unknown[] = [];
      render(<OnboardingScreen onComplete={vi.fn()} onEvent={(event) => events.push(event)} />);
      act(() => {
        vi.advanceTimersByTime(onboardingAutoAdvanceMs);
      });
      next(); // 1 → 2 (밀기)
      swipeBack(); // 2 → 1 — 이미 본 스텝이라 열람을 다시 내지 않습니다.
      fireEvent.tap(actionButton(), {});
      expect(events).toEqual([
        { name: "onboarding_step_viewed", step: "1", via: "start" },
        { name: "onboarding_step_viewed", step: "2", via: "auto" },
        { name: "onboarding_step_viewed", step: "3", via: "swipe" },
        { name: "onboarding_started", step: "2", autoAdvanced: true },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
