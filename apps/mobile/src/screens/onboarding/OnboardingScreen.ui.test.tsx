import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

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

function next() {
  fireEvent.tap(screen.getByTestId("onboarding-screen-next"), {});
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
  it("[OB-U4] 현재 진행 점만 data-current='true'이고 스텝을 따라 옮겨 간다", () => {
    render(<OnboardingScreen onComplete={vi.fn()} />);

    function currentDots(): readonly (typeof onboardingSteps)[number][] {
      return onboardingSteps.filter(
        (step) =>
          screen
            .getByTestId(`onboarding-screen-progress-dot-${step}`)
            .getAttribute("data-current") === "true",
      );
    }

    expect(currentDots()).toEqual([0]);
    next();
    expect(currentDots()).toEqual([1]);
    next();
    expect(currentDots()).toEqual([2]);
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
  it("[OB-U6] 액션 라벨이 마지막에서 갈린다(다음 → 시작하기)", () => {
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

    const action = screen.getByTestId("onboarding-screen-next");
    expect(action).toHaveAttribute("accessibility-element", "true");
    expect(action).toHaveAttribute("accessibility-label", onboardingActionLabel(0));
    expect(action).toHaveAttribute("accessibility-traits", "button");

    next();

    const nameAtStep1 = progress.getAttribute("accessibility-label");
    expect(nameAtStep1).not.toBe(nameAtStep0);
  });
});
