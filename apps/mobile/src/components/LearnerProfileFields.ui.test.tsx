import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import type {
  LearnerCountry,
  LearnerProfilePort,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";
import { uiCopyEn } from "../lib/ui-copy-en";
import { LearnerCountryPicker } from "./LearnerCountryPicker";
import { LearnerProfileFields } from "./LearnerProfileFields";
import type { LearnerProfileDraftStatus } from "./learner-profile.contract";
import { useLearnerProfileForm } from "./use-learner-profile-form";

// `ui` 계층: 미리보기 · 이름 칸 · 나라 줄의 렌더와 오류가 서는 때를 봅니다. 검증 · 미리보기 · 판정은
// 순수 함수(unit)가 지므로 기대값이 필요하면 포트나 문구표에서 읽습니다. 나라 표 자산은 비어 있어
// 손으로 세운 몇 행의 포트를 씁니다.

const copy = uiCopyEn.learnerProfile;

const countries: readonly LearnerCountry[] = [
  { code: "AF", ko: "아프가니스탄", roman: "apeuganiseutan", en: "Afghanistan" },
  { code: "BS", ko: "바하마", roman: "bahama", en: "Bahamas", article: "the" },
  { code: "FR", ko: "프랑스", roman: "peurangseu", en: "France" },
  { code: "DE", ko: "독일", roman: "dogil", en: "Germany" },
  { code: "KP", ko: "북한", roman: "bukhan", en: "North Korea" },
  { code: "ZA", ko: "남아프리카공화국", roman: "namapeurikagonghwaguk", en: "South Africa" },
  { code: "KR", ko: "한국", roman: "hanguk", en: "South Korea" },
  { code: "US", ko: "미국", roman: "miguk", en: "United States", article: "the" },
];

const port: LearnerProfilePort = {
  search: (query) => {
    const folded = query.trim().toLowerCase();
    return folded === ""
      ? countries
      : countries.filter(
          (country) => country.en.toLowerCase().includes(folded) || country.ko.includes(folded),
        );
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

const emptyMessage = "EMPTY-MESSAGE-FIXTURE";

function Host(props: {
  readonly initial: LearnerProfileRecord | null;
  readonly onStatus?: (status: LearnerProfileDraftStatus) => void;
}) {
  const form = useLearnerProfileForm({ initial: props.initial, port, emptyMessage });
  return (
    <view>
      {form.draft.view === "picker" ? (
        <LearnerCountryPicker form={form} />
      ) : (
        <LearnerProfileFields form={form} />
      )}
      <view
        data-testid="host-submit"
        bindtap={() => {
          const status = form.submit();
          if (status.kind === "empty" || status.kind === "incomplete") form.noticeIncomplete();
          props.onStatus?.(status);
        }}
      />
    </view>
  );
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

function nameField(): HTMLElement {
  return within(screen.getByTestId("learner-profile-name")).getByTestId("ui-lynx-text-field");
}

function nameInput(): HTMLElement {
  return within(screen.getByTestId("learner-profile-name")).getByTestId("ui-lynx-text-field-input");
}

function nameSupportingText(): string {
  return (
    within(screen.getByTestId("learner-profile-name")).queryByTestId(
      "ui-lynx-text-field-supporting-row",
    )?.textContent ?? ""
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

function submit() {
  fireEvent.tap(screen.getByTestId("host-submit"), {});
}

function previewLineTexts(): string[] {
  return screen
    .queryAllByTestId("learner-profile-preview-line")
    .map((line) => line.textContent ?? "");
}

function previewKind(): string | null {
  return screen.getByTestId("learner-profile-preview").getAttribute("data-kind");
}

function lastStatus(onStatus: Mock<(s: LearnerProfileDraftStatus) => void>) {
  return onStatus.mock.calls.at(-1)?.[0];
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("LearnerProfileFields", () => {
  it("[UF-1] 기록이 없으면 견본 미리보기 · 이름 칸 · 나라 줄 `Not set` · 오류 없음으로 선다", () => {
    render(<Host initial={null} />);

    expect(screen.getByTestId("learner-profile-fields")).toBeTruthy();
    const example = port.previewOf(null, null);
    expect(previewKind()).toBe("example");
    expect(previewLineTexts()).toEqual(example.lines.flatMap((line) => [line.ko, line.en]));
    expect(screen.getByTestId("learner-profile-preview")).toHaveTextContent(
      copy.preview.heading.example,
    );
    const only = example.lines[0];
    if (only === undefined) throw new Error("견본 줄이 없습니다");
    expect(screen.getByTestId("learner-profile-preview")).toHaveAttribute(
      "accessibility-label",
      copy.preview.label("example", only.ko, only.en),
    );

    expect(nameInput().getAttribute("accessibility-label")).toContain(`${copy.nameLabel},`);
    expect(nameInput()).not.toHaveAttribute("placeholder");
    expect(nameField()).toHaveAttribute("data-validation", "none");
    expect(countryCell()).toHaveAttribute(
      "accessibility-label",
      `${copy.countryLabel}, ${copy.notSet}`,
    );
  });

  it("[UF-2] 기록이 `Emma` · `DE`면 이름 칸 초기값 · 나라 줄 · 두 쌍 미리보기가 그 값으로 선다", () => {
    render(<Host initial={{ name: "Emma", countryCode: "DE" }} />);

    expect(nameInput()).toHaveAttribute("default-value", "Emma");
    expect(countryCell()).toHaveAttribute("accessibility-label", `${copy.countryLabel}, Germany`);
    expect(previewKind()).toBe("yours");
    const expected = port.previewOf("Emma", port.byCode("DE")).lines;
    expect(expected).toHaveLength(2);
    expect(previewLineTexts()).toEqual(expected.flatMap((line) => [line.ko, line.en]));
  });

  it("[UF-3] 이름을 치면 미리보기가 바뀌고 능동 낭독은 0회다", () => {
    const announced = stubAnnounceHost();
    render(<Host initial={null} />);

    typeName("Liam");

    expect(previewKind()).toBe("yours");
    const expected = port.previewOf("Liam", null).lines;
    expect(previewLineTexts()).toEqual(expected.flatMap((line) => [line.ko, line.en]));
    expect(announced).toHaveLength(0);
  });

  it("[UF-4] 이름에 `{x}`를 치면 즉시 오류 · 낭독 1회 · 미리보기는 견본이고, 고치면 걷힌다", () => {
    const announced = stubAnnounceHost();
    render(<Host initial={null} />);

    typeName("{x}");

    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameIssue["forbidden-character"]);
    expect(nameInput().getAttribute("accessibility-label")).toContain(
      `Error: ${copy.nameIssue["forbidden-character"]}`,
    );
    expect(announced).toEqual([copy.nameIssue["forbidden-character"]]);
    expect(previewKind()).toBe("example");

    typeName("Liam");

    expect(nameField()).toHaveAttribute("data-validation", "none");
    expect(nameSupportingText()).not.toContain(copy.nameIssue["forbidden-character"]);
    expect(previewKind()).toBe("yours");
  });

  it("[UF-4b] 붙여넣기로 31자가 들어오면 즉시 길이 오류가 서고 미리보기는 견본이다", () => {
    stubAnnounceHost();
    render(<Host initial={null} />);

    typeName("a".repeat(31));

    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(copy.nameIssue["too-long"]);
    expect(previewKind()).toBe("example");
  });

  it("[UF-5] 둘 다 빈 채 저장을 누르면 이름 칸에 `emptyMessage`가 서고 낭독 1회, 이름을 치면 걷힌다", () => {
    const announced = stubAnnounceHost();
    const onStatus = vi.fn<(s: LearnerProfileDraftStatus) => void>();
    render(<Host initial={null} onStatus={onStatus} />);

    // 누르기 전에는 빈 이름이 오류가 아니다.
    expect(nameField()).toHaveAttribute("data-validation", "none");

    submit();

    expect(lastStatus(onStatus)).toEqual({ kind: "empty" });
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(emptyMessage);
    expect(announced).toHaveLength(1);
    expect(previewKind()).toBe("example");

    typeName("Emma");

    expect(nameField()).toHaveAttribute("data-validation", "none");
  });

  it("[UF-5b] 이름만 채우고 저장하면 나라 줄에 오류가 서고 이름 칸은 조용하다 · 낭독 1회 · 나라를 고르면 걷힌다", () => {
    const announced = stubAnnounceHost();
    const onStatus = vi.fn<(s: LearnerProfileDraftStatus) => void>();
    render(<Host initial={null} onStatus={onStatus} />);
    typeName("Emma");
    const fields = screen.getByTestId("learner-profile-fields");
    expect(fields.textContent).not.toContain(copy.countryMissing);

    submit();

    expect(lastStatus(onStatus)).toEqual({ kind: "incomplete", missing: "country" });
    expect(fields.textContent).toContain(copy.countryMissing);
    expect(nameField()).toHaveAttribute("data-validation", "none");
    expect(announced).toHaveLength(1);
    expect(announced[0]).toContain(copy.countryMissing);

    chooseCountry("DE");

    expect(screen.getByTestId("learner-profile-fields").textContent).not.toContain(
      copy.countryMissing,
    );
  });

  it("[UF-5c] 나라만 고르고 저장하면 이름 칸에 `emptyMessage`가 서고 나라 줄은 조용하다 · 낭독 1회", () => {
    const announced = stubAnnounceHost();
    const onStatus = vi.fn<(s: LearnerProfileDraftStatus) => void>();
    render(<Host initial={null} onStatus={onStatus} />);
    chooseCountry("FR");

    submit();

    expect(lastStatus(onStatus)).toEqual({ kind: "incomplete", missing: "name" });
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(emptyMessage);
    expect(screen.getByTestId("learner-profile-fields").textContent).not.toContain(
      copy.countryMissing,
    );
    expect(announced).toHaveLength(1);
    expect(announced[0]).toContain(emptyMessage);
  });

  it("[UF-5d] 공백뿐인 이름 + 나라는 이름이 빈 것으로 읽어 같은 오류가 선다", () => {
    stubAnnounceHost();
    const onStatus = vi.fn<(s: LearnerProfileDraftStatus) => void>();
    render(<Host initial={{ name: "Emma", countryCode: "DE" }} onStatus={onStatus} />);

    typeName("   ");
    submit();

    expect(lastStatus(onStatus)).toEqual({ kind: "incomplete", missing: "name" });
    expect(nameField()).toHaveAttribute("data-validation", "error");
    expect(nameSupportingText()).toContain(emptyMessage);
  });

  it("[UF-6] 이름과 나라가 둘 다 있으면 저장 판정이 ready이고 오류 · 낭독이 없다 · 이름은 다듬어 담긴다", () => {
    const announced = stubAnnounceHost();
    const onStatus = vi.fn<(s: LearnerProfileDraftStatus) => void>();
    render(<Host initial={null} onStatus={onStatus} />);

    typeName("  Liam  ");
    chooseCountry("FR");
    submit();

    expect(lastStatus(onStatus)).toEqual({
      kind: "ready",
      record: { name: "Liam", countryCode: "FR" },
    });
    expect(nameField()).toHaveAttribute("data-validation", "none");
    expect(announced).toHaveLength(0);
  });

  it("[UF-6b] 금지 문자가 든 이름은 나라가 있어도 invalid다", () => {
    stubAnnounceHost();
    const onStatus = vi.fn<(s: LearnerProfileDraftStatus) => void>();
    render(<Host initial={{ name: "Emma", countryCode: "DE" }} onStatus={onStatus} />);

    typeName("{x}");
    submit();

    expect(lastStatus(onStatus)).toEqual({ kind: "invalid", issue: "forbidden-character" });
  });

  it("[UF-7] 이름 칸에 네이티브 maxlength 30과 `n/30` 카운터가 선다", () => {
    render(<Host initial={null} />);

    expect(nameInput()).toHaveAttribute("maxlength", "30");
    expect(nameSupportingText()).toContain("0/30");

    typeName("Liam");

    expect(nameSupportingText()).toContain("4/30");
  });

  it("[UF-8] 나라 줄을 누르면 양식이 사라지고 나라 고르기가 선다", () => {
    render(<Host initial={null} />);

    fireEvent.tap(countryCell(), {});

    expect(screen.queryByTestId("learner-profile-fields")).toBeNull();
    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();
  });

  it("[UF-9] 표에 없는 코드(`ZZ`)의 기록은 나라 줄이 `Not set`이고 미리보기에 나라 문장이 없다", () => {
    render(<Host initial={{ name: "Emma", countryCode: "ZZ" }} />);

    expect(countryCell()).toHaveAttribute(
      "accessibility-label",
      `${copy.countryLabel}, ${copy.notSet}`,
    );
    const expected = port.previewOf("Emma", null).lines;
    expect(previewLineTexts()).toEqual(expected.flatMap((line) => [line.ko, line.en]));
  });

  it("[UF-10] 나라를 고르고 돌아와도 이름 칸에 친 값이 남는다", () => {
    render(<Host initial={null} />);
    typeName("Liam");

    chooseCountry("KR");

    expect(nameInput()).toHaveAttribute("default-value", "Liam");
    expect(countryCell()).toHaveAttribute(
      "accessibility-label",
      `${copy.countryLabel}, South Korea`,
    );
  });
});
