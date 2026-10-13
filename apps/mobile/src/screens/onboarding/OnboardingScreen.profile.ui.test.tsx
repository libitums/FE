import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type {
  LearnerCountry,
  LearnerProfileOutcome,
  LearnerProfilePort,
  LearnerProfileRecord,
} from "../../lib/learner-profile.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { OnboardingScreen } from "./OnboardingScreen";

// `ui` 계층: 온보딩 넷째(마지막) 스텝의 양식을 봅니다. 이름과 나라는 둘 다 있어야 저장되고, 둘 다 빈 채
// `Get started`는 건너뜀이며, 한 칸만 찬 채는 빈 칸에 오류를 세우고 머뭅니다. 앞 세 스텝의 카드 · 문구는
// 기존 파일(`OnboardingScreen.ui.test.tsx`)이 지킵니다. 나라 표 자산은 비어 있어 손으로 세운 포트를 씁니다.

const copy = uiCopyEn.learnerProfile;

const countries: readonly LearnerCountry[] = [
  { code: "FR", ko: "프랑스", roman: "peurangseu", en: "France" },
  { code: "DE", ko: "독일", roman: "dogil", en: "Germany" },
  { code: "KR", ko: "한국", roman: "hanguk", en: "South Korea" },
];

const port: LearnerProfilePort = {
  search: (query) => {
    const folded = query.trim().toLowerCase();
    return folded === ""
      ? countries
      : countries.filter((country) => country.en.toLowerCase().includes(folded));
  },
  byCode: (code) => countries.find((country) => country.code === code) ?? null,
  previewOf: (name, country) => {
    const lines: { ko: string; en: string }[] = [];
    if (name !== null) lines.push({ ko: `${name}로 예약했어요.`, en: `I booked under ${name}.` });
    if (country !== null) {
      lines.push({ ko: `저는 ${country.ko}에서 왔어요.`, en: `I'm from ${country.en}.` });
    }
    return lines.length === 0
      ? { kind: "example", lines: [{ ko: "Emma로 예약했어요.", en: "I booked under Emma." }] }
      : { kind: "yours", lines };
  },
};

function renderOnboarding(
  onComplete: (outcome: LearnerProfileOutcome) => void = () => undefined,
  learnerRecord: LearnerProfileRecord | null = null,
) {
  return render(
    <OnboardingScreen onComplete={onComplete} learnerRecord={learnerRecord} learnerPort={port} />,
  );
}

function action(): HTMLElement {
  return within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button");
}

function next() {
  fireEvent.tap(action(), {});
}

function goToProfileStep() {
  next();
  next();
  next();
}

function stubAnnounceHost(): string[] {
  const contents: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (...args: readonly unknown[]) => {
        contents.push((args[0] as { content: string }).content);
      },
    },
  });
  return contents;
}

function typeName(value: string) {
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

function countryCell(): HTMLElement {
  return within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
    "ui-lynx-settings-cell",
  );
}

function chooseCountry(code: string) {
  fireEvent.tap(countryCell(), {});
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-${code}`), {});
}

function nameField(): HTMLElement {
  return within(screen.getByTestId("learner-profile-name")).getByTestId("ui-lynx-text-field");
}

function nameSupportingText(): string {
  return (
    within(screen.getByTestId("learner-profile-name")).queryByTestId(
      "ui-lynx-text-field-supporting-row",
    )?.textContent ?? ""
  );
}

function pressSystemBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("OnboardingScreen — 넷째 스텝(이름 · 나라)", () => {
  it("[UO-1] 다음 셋이면 data-step 3 · 카드 자리에 양식 · 진행 `Step 4 of 4` · `Get started` · 제목(header)이 선다", () => {
    renderOnboarding();

    goToProfileStep();

    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "3");
    expect(
      within(screen.getByTestId("onboarding-screen-profile")).getByTestId("learner-profile-fields"),
    ).toBeTruthy();
    expect(screen.getByTestId("onboarding-screen-progress")).toHaveAttribute(
      "accessibility-label",
      "Step 4 of 4",
    );
    expect(action().closest('[data-testid="onboarding-screen-next"]')).toHaveTextContent(
      "Get started",
    );
    const title = screen.getByTestId("onboarding-screen-title");
    expect(title).toHaveTextContent("Make it yours");
    expect(title).toHaveAttribute("accessibility-traits", "header");
    expect(screen.getByTestId("onboarding-screen-body")).toHaveTextContent("Optional");
  });

  it("[UO-2] 셋째 스텝(data-step 2)의 라벨은 `Next`다", () => {
    renderOnboarding();
    next();
    next();

    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "2");
    expect(screen.getByTestId("onboarding-screen-next")).toHaveTextContent("Next");
    expect(screen.getByTestId("onboarding-screen-next")).not.toHaveTextContent("Get started");
  });

  it("[UO-3] 둘 다 빈 채 `Get started`는 건너뜀 — onComplete({kind:'skipped'}) 1회 · 오류 0", () => {
    const onComplete = vi.fn<(outcome: LearnerProfileOutcome) => void>();
    stubAnnounceHost();
    renderOnboarding(onComplete);
    goToProfileStep();

    next();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ kind: "skipped" });
    expect(nameField()).toHaveAttribute("data-validation", "none");
    expect(screen.getByTestId("onboarding-screen-profile").textContent).not.toContain(
      copy.countryMissing,
    );
  });

  it("[UO-4] 이름과 나라를 넣고 `Get started`는 onComplete({kind:'saved', record}) 1회다", () => {
    const onComplete = vi.fn<(outcome: LearnerProfileOutcome) => void>();
    renderOnboarding(onComplete);
    goToProfileStep();

    typeName("  Emma  ");
    chooseCountry("DE");
    next();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      kind: "saved",
      record: { name: "Emma", countryCode: "DE" },
    });
  });

  it("[UO-5] 이름만 넣고 `Get started`는 완료하지 않고 나라 줄에 오류를 세운다(스텝 3 그대로 · 낭독 1회)", () => {
    const onComplete = vi.fn<(outcome: LearnerProfileOutcome) => void>();
    const announced = stubAnnounceHost();
    renderOnboarding(onComplete);
    goToProfileStep();
    typeName("Emma");

    next();

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "3");
    expect(screen.getByTestId("onboarding-screen-profile").textContent).toContain(
      copy.countryMissing,
    );
    expect(nameField()).toHaveAttribute("data-validation", "none");
    expect(announced).toHaveLength(1);
    expect(announced[0]).toContain(copy.countryMissing);
  });

  it("[UO-5b] 나라만 고르고 `Get started`는 완료하지 않고 이름 칸에 `nameIssue.empty`를 세운다", () => {
    const onComplete = vi.fn<(outcome: LearnerProfileOutcome) => void>();
    const announced = stubAnnounceHost();
    renderOnboarding(onComplete);
    goToProfileStep();
    chooseCountry("FR");

    next();

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "3");
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameIssue.empty);
    expect(announced).toHaveLength(1);
  });

  it("[UO-5c] 빈 칸 오류는 채우면 걷히고 그 뒤 `Get started`가 저장으로 완료한다", () => {
    const onComplete = vi.fn<(outcome: LearnerProfileOutcome) => void>();
    stubAnnounceHost();
    renderOnboarding(onComplete);
    goToProfileStep();
    typeName("Emma");
    next();
    expect(screen.getByTestId("onboarding-screen-profile").textContent).toContain(
      copy.countryMissing,
    );

    chooseCountry("KR");

    expect(screen.getByTestId("onboarding-screen-profile").textContent).not.toContain(
      copy.countryMissing,
    );
    next();
    expect(onComplete).toHaveBeenCalledWith({
      kind: "saved",
      record: { name: "Emma", countryCode: "KR" },
    });
  });

  it("[UO-6] 이름에 `{x}`를 치면 오류가 서고 `Get started`는 완료하지 않는다", () => {
    const onComplete = vi.fn<(outcome: LearnerProfileOutcome) => void>();
    stubAnnounceHost();
    renderOnboarding(onComplete);
    goToProfileStep();

    typeName("{x}");
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameIssue["forbidden-character"]);

    next();

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "3");
  });

  it("[UO-7] 나라 줄을 누르면 온보딩 화면이 사라지고 나라 고르기만 서며, 고르면 data-step 3으로 돌아와 이름이 남는다", () => {
    renderOnboarding();
    goToProfileStep();
    typeName("Emma");

    fireEvent.tap(countryCell(), {});

    expect(screen.queryByTestId("onboarding-screen")).toBeNull();
    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-FR"), {});

    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "3");
    expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute("default-value", "Emma");
    expect(countryCell()).toHaveAttribute("accessibility-label", `${copy.countryLabel}, France`);
  });

  it("[UO-8] 스텝 3의 뒤로는 data-step 2로 가고, 시스템 뒤로도 같다 · 나라 고르기가 서 있으면 양식으로만 돌아간다", () => {
    renderOnboarding();
    goToProfileStep();

    fireEvent.tap(
      within(screen.getByTestId("onboarding-screen-header")).getByTestId("ui-lynx-round-button"),
      {},
    );
    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "2");

    next();
    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "3");
    expect(pressSystemBack()).toBe(true);
    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "2");

    next();
    fireEvent.tap(countryCell(), {});
    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();

    expect(pressSystemBack()).toBe(true);

    expect(screen.queryByTestId("learner-country-picker")).toBeNull();
    expect(screen.getByTestId("onboarding-screen")).toHaveAttribute("data-step", "3");
  });

  it("[UO-9] `learnerRecord` prop이 있으면 스텝 3의 양식이 그 값으로 선다", () => {
    renderOnboarding(() => undefined, { name: "Emma", countryCode: "DE" });
    goToProfileStep();

    expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute("default-value", "Emma");
    expect(countryCell()).toHaveAttribute("accessibility-label", `${copy.countryLabel}, Germany`);
    expect(screen.getByTestId("learner-profile-preview")).toHaveAttribute("data-kind", "yours");
  });

  it("[UO-10] 스텝 0 ~ 2에는 양식이 없고 기존 카드가 선다(그림 카드 · 학습 유닛 카드)", () => {
    renderOnboarding();

    expect(screen.getByTestId("onboarding-screen-hero")).toBeTruthy();
    expect(screen.queryByTestId("onboarding-screen-profile")).toBeNull();
    next();
    expect(screen.queryByTestId("onboarding-screen-profile")).toBeNull();
    next();
    expect(screen.getByTestId("onboarding-screen-unit")).toBeTruthy();
    expect(screen.queryByTestId("onboarding-screen-profile")).toBeNull();
  });
});
