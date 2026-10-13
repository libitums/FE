import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { LearnerCountry, LearnerProfilePort } from "../../lib/learner-profile.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { LearnerProfileGateScreen } from "./LearnerProfileGateScreen";

// `ui` 계층: 에피소드 전 묻기 화면의 머리 · 문구 · 제출의 갈래(저장 / 빔 · 한 칸 / 무효) · Skip · 뒤로 ·
// 나라 고르기가 서는 동안의 모양을 봅니다. 나라 표 자산은 비어 있어 손으로 세운 포트를 씁니다.

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

function renderGate() {
  const onSubmit = vi.fn<(record: { name: string; countryCode: string }) => void>();
  const onSkip = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <LearnerProfileGateScreen port={port} onSubmit={onSubmit} onSkip={onSkip} onCancel={onCancel} />,
  );
  return { onSubmit, onSkip, onCancel };
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

function chooseCountry(code: string) {
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-${code}`), {});
}

// 버튼 testid는 래퍼에 붙고 안에 ui-lynx 버튼이 섭니다.
function wrappedButton(testId: string): HTMLElement {
  const wrapper = screen.getByTestId(testId);
  const inner = wrapper.querySelector(
    '[data-testid="ui-lynx-button"], [data-testid="ui-lynx-round-button"]',
  );
  return (inner ?? wrapper) as HTMLElement;
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("LearnerProfileGateScreen", () => {
  it("[UG-1] 제목(header) · 설명 · 빈 양식 · 뒤로 · Skip · 주 버튼이 문구표대로 선다", () => {
    renderGate();

    expect(screen.getByTestId("learner-profile-gate-screen")).toBeTruthy();
    const title = screen.getByTestId("learner-profile-gate-title");
    expect(title).toHaveTextContent(copy.gate.title);
    expect(title).toHaveAttribute("accessibility-traits", "header");
    expect(screen.getByTestId("learner-profile-gate-screen")).toHaveTextContent(copy.gate.body);
    expect(screen.getByTestId("learner-profile-fields")).toBeTruthy();
    expect(screen.getByTestId("learner-profile-preview")).toHaveAttribute("data-kind", "example");
    expect(wrappedButton("learner-profile-gate-back")).toHaveAttribute(
      "accessibility-label",
      "Back",
    );
    expect(screen.getByTestId("learner-profile-gate-skip")).toHaveTextContent(uiCopyEn.common.skip);
    expect(screen.getByTestId("learner-profile-gate-submit")).toHaveTextContent(copy.gate.submit);
  });

  it("[UG-2] 이름과 나라가 둘 다 있으면 저장 버튼이 onSubmit을 정규화된 기록으로 1회 부른다", () => {
    const { onSubmit, onSkip } = renderGate();

    typeName("  Emma  ");
    chooseCountry("DE");
    fireEvent.tap(wrappedButton("learner-profile-gate-submit"), {});

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ name: "Emma", countryCode: "DE" });
    expect(onSkip).not.toHaveBeenCalled();
  });

  it("[UG-2b] 둘 다 빈 채 저장하면 onSubmit 0회 · 이름 칸에 `nameEmptyOnGate`가 선다", () => {
    const announced = stubAnnounceHost();
    const { onSubmit } = renderGate();

    fireEvent.tap(wrappedButton("learner-profile-gate-submit"), {});

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameEmptyOnGate);
    expect(announced).toHaveLength(1);
  });

  it("[UG-2c] 이름만 채우면 onSubmit 0회 · 나라 줄에 `countryMissing`이 선다", () => {
    const announced = stubAnnounceHost();
    const { onSubmit } = renderGate();

    typeName("Emma");
    fireEvent.tap(wrappedButton("learner-profile-gate-submit"), {});

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("learner-profile-fields").textContent).toContain(
      copy.countryMissing,
    );
    expect(nameField()).toHaveAttribute("data-validation", "none");
    expect(announced).toHaveLength(1);
  });

  it("[UG-2d] 나라만 고르면 onSubmit 0회 · 이름 칸에 `nameEmptyOnGate`가 선다", () => {
    stubAnnounceHost();
    const { onSubmit } = renderGate();

    chooseCountry("FR");
    fireEvent.tap(wrappedButton("learner-profile-gate-submit"), {});

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameEmptyOnGate);
  });

  it("[UG-2e] 금지 문자가 든 이름은 나라가 있어도 onSubmit 0회다", () => {
    stubAnnounceHost();
    const { onSubmit } = renderGate();

    typeName("{x}");
    chooseCountry("FR");
    fireEvent.tap(wrappedButton("learner-profile-gate-submit"), {});

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameIssue["forbidden-character"]);
  });

  it("[UG-3] Skip은 칸이 무엇이든 onSkip을 1회 부르고 onSubmit은 부르지 않는다", () => {
    const { onSubmit, onSkip } = renderGate();
    typeName("Emma");

    fireEvent.tap(wrappedButton("learner-profile-gate-skip"), {});

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("[UG-4] 뒤로와 시스템 뒤로는 onCancel을 부르고 onSkip은 부르지 않는다", () => {
    const { onCancel, onSkip } = renderGate();

    fireEvent.tap(wrappedButton("learner-profile-gate-back"), {});
    expect(onCancel).toHaveBeenCalledTimes(1);

    let handled = false;
    act(() => {
      handled = backHandlers.runTop();
    });
    expect(handled).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it("[UG-5] 나라 고르기가 서면 data-view가 picker이고 Skip은 남고 주 버튼은 없다 · 돌아오면 다시 선다", () => {
    renderGate();

    fireEvent.tap(
      within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
        "ui-lynx-settings-cell",
      ),
      {},
    );

    expect(screen.getByTestId("learner-profile-frame")).toHaveAttribute("data-view", "picker");
    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();
    expect(screen.getByTestId("learner-profile-gate-skip")).toBeTruthy();
    expect(screen.queryByTestId("learner-profile-gate-submit")).toBeNull();

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-KR"), {});

    expect(screen.getByTestId("learner-profile-frame")).toHaveAttribute("data-view", "form");
    expect(screen.getByTestId("learner-profile-gate-submit")).toBeTruthy();
  });

  it("[UG-6] 양식이 서 있는 동안 화면 안 header는 제목 하나다", () => {
    renderGate();

    const headers = screen
      .getByTestId("learner-profile-gate-screen")
      .querySelectorAll('[accessibility-traits="header"]');
    expect(headers).toHaveLength(1);
    expect(headers[0]).toBe(screen.getByTestId("learner-profile-gate-title"));
  });
});
