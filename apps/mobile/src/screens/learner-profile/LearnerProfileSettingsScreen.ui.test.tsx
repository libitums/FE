import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type {
  LearnerCountry,
  LearnerProfilePort,
  LearnerProfileRecord,
} from "../../lib/learner-profile.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { LearnerProfileSettingsScreen } from "./LearnerProfileSettingsScreen";

// `ui` 계층: 설정에서 고치는 화면의 채움 · 저장의 갈래 · 낭독 · 뒤로를 봅니다. 이름과 나라는 둘 다 있어야
// 저장되고, 기존 기록을 지우는 길은 없습니다. 나라 표 자산은 비어 있어 손으로 세운 포트를 씁니다.

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
  randomName: () => "Leo",
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

const saved: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };

function renderSettings(record: LearnerProfileRecord | null) {
  const onSubmit = vi.fn<(next: LearnerProfileRecord) => void>();
  const onExit = vi.fn<() => void>();
  render(
    <LearnerProfileSettingsScreen
      record={record}
      port={port}
      onSubmit={onSubmit}
      onExit={onExit}
    />,
  );
  return { onSubmit, onExit };
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

function wrappedButton(testId: string): HTMLElement {
  const wrapper = screen.getByTestId(testId);
  const inner = wrapper.querySelector(
    '[data-testid="ui-lynx-button"], [data-testid="ui-lynx-round-button"]',
  );
  return (inner ?? wrapper) as HTMLElement;
}

function save() {
  fireEvent.tap(wrappedButton("learner-profile-screen-submit"), {});
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

describe("LearnerProfileSettingsScreen", () => {
  it("[UT-1] 기록이 칸에 서 있고 Skip이 없으며 제목 · 설명 · 주 버튼 · 뒤로 이름이 문구표대로다", () => {
    renderSettings(saved);

    expect(screen.getByTestId("learner-profile-screen")).toBeTruthy();
    const title = screen.getByTestId("learner-profile-screen-title");
    expect(title).toHaveTextContent(copy.settings.title);
    expect(title).toHaveAttribute("accessibility-traits", "header");
    expect(screen.getByTestId("learner-profile-screen")).toHaveTextContent(copy.settings.body);
    expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute("default-value", "Emma");
    expect(
      within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
        "ui-lynx-settings-cell",
      ),
    ).toHaveAttribute("accessibility-label", `${copy.countryLabel}, Germany`);
    expect(screen.queryByTestId("learner-profile-gate-skip")).toBeNull();
    expect(screen.getByTestId("learner-profile-screen-submit")).toHaveTextContent(
      copy.settings.submit,
    );
    expect(wrappedButton("learner-profile-screen-back")).toHaveAttribute(
      "accessibility-label",
      uiCopyEn.common.backToSettings,
    );
  });

  it("[UT-2] 이름을 고쳐 저장하면 onSubmit(새 기록)이 1회이고 `saved` 낭독이 1회다", () => {
    const announced = stubAnnounceHost();
    const { onSubmit } = renderSettings(saved);

    typeName("Liam");
    save();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ name: "Liam", countryCode: "DE" });
    expect(announced).toEqual([copy.settings.saved]);
  });

  it("[UT-2b] 나라를 바꿔 저장해도 onSubmit(새 기록) 1회 · `saved` 낭독 1회다", () => {
    const announced = stubAnnounceHost();
    const { onSubmit } = renderSettings(saved);

    chooseCountry("FR");
    save();

    expect(onSubmit).toHaveBeenCalledWith({ name: "Emma", countryCode: "FR" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(announced.filter((text) => text === copy.settings.saved)).toHaveLength(1);
  });

  it("[UT-3] 고치지 않고 저장하면 onSubmit(같은 기록) 1회이고 `saved` 낭독은 없다", () => {
    const announced = stubAnnounceHost();
    const { onSubmit } = renderSettings(saved);

    save();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(saved);
    expect(announced).toHaveLength(0);
  });

  it("[UT-4] 이름을 지우고 저장하면 onSubmit 0회 · 이름 칸에 `nameIssue.empty`가 선다(지우는 길은 없다)", () => {
    stubAnnounceHost();
    const { onSubmit } = renderSettings(saved);

    typeName("");
    save();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameIssue.empty);
  });

  it("[UT-5] 금지 문자가 든 이름은 저장되지 않는다", () => {
    stubAnnounceHost();
    const { onSubmit } = renderSettings(saved);

    typeName("{x}");
    save();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameIssue["forbidden-character"]);
  });

  it("[UT-6] 뒤로와 시스템 뒤로는 고친 것을 버리고 onExit을 부른다", () => {
    const { onSubmit, onExit } = renderSettings(saved);
    typeName("Liam");

    fireEvent.tap(wrappedButton("learner-profile-screen-back"), {});
    expect(onExit).toHaveBeenCalledTimes(1);

    let handled = false;
    act(() => {
      handled = backHandlers.runTop();
    });
    expect(handled).toBe(true);
    expect(onExit).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("[UT-7] 기록이 없어도 빈 양식으로 서고, 빈 채 저장하면 막힌다", () => {
    stubAnnounceHost();
    const { onSubmit } = renderSettings(null);

    expect(screen.getByTestId("ui-lynx-text-field-input")).not.toHaveAttribute(
      "default-value",
      "Emma",
    );
    expect(screen.getByTestId("learner-profile-preview")).toHaveAttribute("data-kind", "example");

    save();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameField()).toHaveAttribute("data-validation", "error");
  });

  it("[UT-8] 나라 고르기가 서면 주 버튼이 사라지고 고르면 돌아온다", () => {
    renderSettings(saved);

    fireEvent.tap(
      within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
        "ui-lynx-settings-cell",
      ),
      {},
    );

    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();
    expect(screen.queryByTestId("learner-profile-screen-submit")).toBeNull();

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-KR"), {});

    expect(screen.getByTestId("learner-profile-screen-submit")).toBeTruthy();
  });
});
