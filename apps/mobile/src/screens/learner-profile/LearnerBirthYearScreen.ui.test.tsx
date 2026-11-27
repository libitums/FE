import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { UiCopyContext, uiCopyFor } from "../../lib/ui-copy";
import { LearnerBirthYearScreen } from "./LearnerBirthYearScreen";

// `ui` 계층(BYS-UI1 ~ UI6): 가입 직후 ④ 출생 연도(ADR-0059 · ADR-0125 개정 2026-11-27). 메신저 생년 시트와 같은 목록
// 규칙 — 가운데에서 열고 · 미리 고르지 않고 · 골라야 Continue · 건너뛰기 없음. COPPA 중립 화면이라 나이 문턱 안내가 없습니다.

const thisYear = 2026;
const row = (year: number) => screen.getByTestId(`learner-birth-year-screen-row-${year}`);
const nextButton = () =>
  within(screen.getByTestId("learner-birth-year-screen-next")).getByTestId("ui-lynx-button");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 27, 9, 0));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount() {
  const onContinue = vi.fn<(year: number) => void>();
  const onBack = vi.fn<() => void>();
  render(<LearnerBirthYearScreen onContinue={onContinue} onBack={onBack} />);
  return { onContinue, onBack };
}

describe("LearnerBirthYearScreen", () => {
  it("BYS-UI1 제목 · 앱 전체 안내 · 4단계 중 넷째 막대 — 나이 문턱 · 건너뛰기가 없다", () => {
    mount();
    const root = screen.getByTestId("learner-birth-year-screen");
    expect(screen.getByTestId("learner-birth-year-screen-title").textContent).toBe(
      "What year were you born?",
    );
    expect(root.textContent).toContain(
      "We use it to keep the app right for your age. It's never shown to anyone.",
    );
    expect(screen.getByTestId("entry-step-bar")).toHaveAttribute(
      "accessibility-label",
      "Step 4 of 4",
    );
    expect(root.textContent).not.toContain("Skip");
    expect(root.textContent).not.toContain("under");
  });

  it("BYS-UI2 연도는 올해 → 100년 전, 가운데(50년 전)에서 열리고 어느 줄도 골라져 있지 않으며 Continue가 꺼져 있다", () => {
    mount();
    expect(row(thisYear)).toBeTruthy();
    expect(row(thisYear - 100)).toBeTruthy();
    expect(screen.queryByTestId(`learner-birth-year-screen-row-${thisYear - 101}`)).toBeNull();
    expect(row(thisYear).parentElement?.getAttribute("initial-scroll-to-index")).toBe("48");
    for (const year of [thisYear, thisYear - 50, 2000]) {
      expect(row(year).getAttribute("data-selected")).toBe("false");
    }
    expect(nextButton().getAttribute("data-disabled")).toBe("true");
  });

  it("BYS-UI3 줄을 고르면 골라진 줄이 하나이고 낭독 이름에 selected가 붙으며, Continue가 그 연도를 낸다", () => {
    const { onContinue } = mount();
    fireEvent.tap(row(1990), {});
    expect(row(1990).getAttribute("data-selected")).toBe("true");
    expect(row(1990).getAttribute("accessibility-label")).toBe("1990, selected");
    fireEvent.tap(row(1991), {});
    expect(row(1990).getAttribute("data-selected")).toBe("false");
    expect(nextButton().getAttribute("data-disabled")).toBe("false");
    fireEvent.tap(nextButton(), {});
    expect(onContinue).toHaveBeenCalledWith(1991);
  });

  it("BYS-UI4 고르기 전 Continue는 아무것도 내지 않는다", () => {
    const { onContinue } = mount();
    fireEvent.tap(nextButton(), {});
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("BYS-UI5 뒤로 단추 · 시스템 뒤로는 onBack", () => {
    const { onBack } = mount();
    fireEvent.tap(
      within(screen.getByTestId("learner-birth-year-screen-back")).getByTestId(
        "ui-lynx-round-button",
      ),
      {},
    );
    expect(onBack).toHaveBeenCalledTimes(1);
    backHandlers.runTop();
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["ja", "何年生まれですか？"],
    ["vi", "Bạn sinh năm nào?"],
  ] as const)("BYS-UI6 %s 문구로 그린다", (language, title) => {
    render(
      <UiCopyContext.Provider value={uiCopyFor(language)}>
        <LearnerBirthYearScreen onContinue={() => undefined} onBack={() => undefined} />
      </UiCopyContext.Provider>,
    );
    expect(screen.getByTestId("learner-birth-year-screen-title").textContent).toBe(title);
    expect(screen.getByTestId("learner-birth-year-screen").textContent).not.toContain("We use it");
  });
});
