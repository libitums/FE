import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { onboardingActionLabel, onboardingSteps } from "./onboarding";
import { OnboardingScreen } from "./OnboardingScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 스텝 진행·진행 점·액션 라벨을 본다 (ADR-0006 D4).
// `step`은 화면 로컬 상태다(계약 §2.4) — 전이 없이 이 컴포넌트 안에서만 돈다.
//
// 계약: .agent-harness/work/lib-261/spec.md §2.4(순수 로직) · §4.2~§4.5(구조·상태 채널·testid) ·
//       §8(액션 라벨은 임시가 아니다 — `다음`/`시작하기`를 그대로 단언한다) · §0.10 (3)(M-4 — 진행
//       래퍼 이름).
// 계획: .agent-harness/work/lib-261/test-plan.md ui § `OnboardingScreen.ui.test.tsx` OB-U1~OB-U7
//       (OB-U7은 보정 r0.3 신설 — M-4).
//
// 제목·본문(`onboardingCopy`의 결과)은 자리표다(§8) — 공백 아님·서로 다름만 본다.
// 액션 라벨(`onboardingActionLabel`의 결과)은 임시가 아니다 — 문자열을 그대로 단언한다.

// 액션은 `onboarding-screen-next` 행 안의 ui-lynx Button이다(2026-09-21 디자인 반영).
function actionButton() {
  return within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button");
}

function next() {
  fireEvent.tap(actionButton(), {});
}

describe("OnboardingScreen (LIB-261)", () => {
  // OB-U1 — n-3(보정 r0.3): 스크롤 상자에 accessibility-*가 0건임을 얹는다(SP1과 같은 형태).
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

  // OB-U2
  it("[OB-U2] 액션을 누르면 data-step이 0→1→2로 간다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);
    const root = screen.getByTestId("onboarding-screen");

    expect(root).toHaveAttribute("data-step", "0");
    next();
    expect(root).toHaveAttribute("data-step", "1");
    next();
    expect(root).toHaveAttribute("data-step", "2");
  });

  // OB-U3
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

  // OB-U4
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

  // OB-U5
  it("[OB-U5] 마지막 스텝 전에는 onComplete가 0회, 마지막에서 1회다", () => {
    const onComplete = vi.fn();
    render(<OnboardingScreen onComplete={onComplete} />);

    next(); // 0 → 1
    expect(onComplete).not.toHaveBeenCalled();
    next(); // 1 → 2
    expect(onComplete).not.toHaveBeenCalled();
    next(); // 2 → 완료
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // OB-U6
  it("[OB-U6] 액션 라벨이 마지막에서 갈린다(Next → Get started)", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);
    const action = screen.getByTestId("onboarding-screen-next");

    expect(action).toHaveTextContent(onboardingActionLabel(0));
    next();
    expect(action).toHaveTextContent(onboardingActionLabel(1));
    next();
    expect(action).toHaveTextContent(onboardingActionLabel(2));
    expect(onboardingActionLabel(2)).not.toBe(onboardingActionLabel(0));
  });

  // OB-U7 — 신설 r0.3(M-4). 진행 래퍼에 이름 있는 accessibility-element가 실재하고, 그
  // 이름이 스텝을 따라 갈린다(리터럴을 박지 않는다 — §8 문구가 바뀌어도 안 깨진다).
  // getByTestId("onboarding-screen-progress")가 존재 앵커다 — 래퍼가 없으면 여기서 먼저
  // TestingLibraryElementError로 죽는다. 같은 케이스에서 액션 행이 element+label+traits="button"
  // 셋을 함께 갖는다도 건다(오늘 그 조합을 함께 보는 자리가 없다).
  it("[OB-U7] 진행 래퍼가 accessibility-element이고 이름이 스텝마다 갈린다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);

    const progress = screen.getByTestId("onboarding-screen-progress");
    expect(progress).toHaveAttribute("accessibility-element", "true");
    const nameAtStep0 = progress.getAttribute("accessibility-label");

    const action = actionButton();
    expect(action).toHaveAttribute("accessibility-element", "true");
    expect(action).toHaveAttribute("accessibility-label", onboardingActionLabel(0));
    expect(action).toHaveAttribute("accessibility-traits", "button");

    next();

    const nameAtStep1 = progress.getAttribute("accessibility-label");
    expect(nameAtStep1).not.toBe(nameAtStep0);
  });

  // OB-U8 — 2026-09-21 디자인 반영: 좌상단 뒤로가기.
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

  // OB-U9 — 2026-09-21 디자인 반영: 둘째 스텝 듣기 카드의 글자 칠하기.
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

      act(() => {
        vi.advanceTimersByTime(350 * 12);
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

  // OB-U10 — 2026-09-21 디자인 반영: 셋째 스텝 학습 유닛의 Learning → Clear.
  it("[OB-U10] 셋째 스텝의 학습 유닛이 학습 중으로 보이다가 잠시 뒤 완료로 바뀐다", () => {
    vi.useFakeTimers();
    try {
      render(<OnboardingScreen onComplete={vi.fn()} />);
      next(); // 0 → 1
      next(); // 1 → 2

      const status = () =>
        within(screen.getByTestId("onboarding-screen-unit")).getByTestId(
          "ui-lynx-status-indicator",
        );
      expect(status()).toHaveAttribute("data-status", "in-progress");
      expect(status()).toHaveTextContent("Learning");

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(status()).toHaveAttribute("data-status", "completed");
      expect(status()).toHaveTextContent("Clear");
    } finally {
      vi.useRealTimers();
    }
  });

  // OB-U11 — 장식 그림(배경·튀어나온 인물)이 이름 없는 접근성 정지로 남지 않는다.
  it("[OB-U11] 첫 스텝 그림 카드는 래퍼가 접근성 자손을 통째로 가린다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);
    const hero = screen.getByTestId("onboarding-screen-hero");
    expect(hero).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(hero.querySelectorAll("image").length).toBeGreaterThan(0);
  });

  // OB-U12 — 화면 문구가 영어라 보조기술 이름도 영어로 맞춘다.
  it("[OB-U12] 진행 표시·학습 유닛 상태의 보조기술 이름이 화면 문구와 같은 영어다", () => {
    vi.useFakeTimers();
    try {
      render(<OnboardingScreen onComplete={vi.fn()} />);
      expect(screen.getByTestId("onboarding-screen-progress")).toHaveAttribute(
        "accessibility-label",
        "Step 1 of 3",
      );
      next();
      next();
      const status = within(screen.getByTestId("onboarding-screen-unit")).getByTestId(
        "ui-lynx-status-indicator",
      );
      expect(status).toHaveAttribute("accessibility-label", "Learning, In progress");
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(status).toHaveAttribute("accessibility-label", "Clear, Completed");
    } finally {
      vi.useRealTimers();
    }
  });
});
