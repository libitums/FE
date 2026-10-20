import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import { learnerCountryAnnounceDelayMs } from "../lib/learner-profile-form";
import type {
  LearnerCountry,
  LearnerProfilePort,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";
import { noLearnerProfilePort } from "../lib/learner-profile";
import { uiCopyEn } from "../lib/ui-copy-en";
import { LearnerCountryPicker } from "./LearnerCountryPicker";
import { LearnerProfileFields } from "./LearnerProfileFields";
import { useLearnerProfileForm } from "./use-learner-profile-form";

// `ui` 계층: 나라 고르기의 줄 · 검색 · 결과 수 안내 · 낭독 · 되돌아옴을 봅니다. 줄의 순서와 걸러짐은
// 순수 함수(unit)가 지므로 기대값은 포트에서 읽습니다. 나라 표 자산은 비어 있어 손으로 세운 포트를 씁니다.

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

function Host(props: {
  readonly initial: LearnerProfileRecord | null;
  readonly port?: LearnerProfilePort;
}) {
  const form = useLearnerProfileForm({
    initial: props.initial,
    port: props.port ?? port,
    emptyMessage: copy.nameIssue.empty,
  });
  return form.draft.view === "picker" ? (
    <LearnerCountryPicker form={form} />
  ) : (
    <LearnerProfileFields form={form} />
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

function typeQuery(value: string) {
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

function openPicker() {
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
}

function rowCodes(): string[] {
  return Array.from(
    screen
      .getByTestId("learner-country-picker-list")
      .querySelectorAll('[data-testid^="ui-lynx-option-selector-item-"]'),
  ).map((row) =>
    (row.getAttribute("data-testid") ?? "").replace("ui-lynx-option-selector-item-", ""),
  );
}

function row(code: string): HTMLElement {
  return screen.getByTestId(`ui-lynx-option-selector-item-${code}`);
}

function helperText(): string {
  return (
    within(screen.getByTestId("learner-country-picker-search")).getByTestId(
      "ui-lynx-text-field-supporting-row",
    ).textContent ?? ""
  );
}

function searchInput(): HTMLElement {
  return within(screen.getByTestId("learner-country-picker-search")).getByTestId(
    "ui-lynx-text-field-input",
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("LearnerCountryPicker", () => {
  it("[UP-1] 열면 제목(header) · 뒤로 · 검색 칸 이름 · 포트 길이의 줄이 영어 이름 순으로 선다", () => {
    render(<Host initial={null} />);
    openPicker();

    const title = screen.getByTestId("learner-country-picker-title");
    expect(title).toHaveTextContent(copy.picker.title);
    expect(title).toHaveAttribute("accessibility-traits", "header");
    const back = within(screen.getByTestId("learner-country-picker-back")).getByTestId(
      "ui-lynx-round-button",
    );
    expect(back).toHaveAttribute("accessibility-label", copy.picker.back);
    expect(searchInput()).toHaveAttribute(
      "accessibility-label",
      `${copy.picker.searchLabel}, ${copy.picker.allCountries(countries.length)}`,
    );
    expect(rowCodes()).toEqual(countries.map((country) => country.code));
    expect(rowCodes()[0]).toBe("AF");
  });

  it("[UP-2] 줄의 보이는 글자는 `영어 · 한국어`이고 접근성 이름은 영어 이름뿐이다(고른 줄은 선택 접미)", () => {
    render(<Host initial={{ name: "Emma", countryCode: "FR" }} />);
    openPicker();

    expect(screen.getByTestId("ui-lynx-option-selector-label-DE")).toHaveTextContent(
      copy.picker.row("Germany", "독일"),
    );
    expect(row("DE")).toHaveAttribute("accessibility-label", "Germany");
    expect(row("FR")).toHaveAttribute("accessibility-label", "France, selected");
  });

  it("[UP-3] 이미 고른 나라가 있으면 빈 질의에서 그 줄이 맨 위이고 한 번만 나온다", () => {
    render(<Host initial={{ name: "Emma", countryCode: "KR" }} />);
    openPicker();

    const codes = rowCodes();
    expect(codes[0]).toBe("KR");
    expect(codes.filter((code) => code === "KR")).toHaveLength(1);
    expect(codes).toHaveLength(countries.length);
  });

  it("[UP-4] 검색어를 치면 줄이 포트 검색 결과와 같은 순서가 되고 안내 줄이 `matches(n)`이다", () => {
    render(<Host initial={null} />);
    openPicker();

    typeQuery("ko");

    const expected = port.search("ko").map((country) => country.code);
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(countries.length);
    expect(rowCodes()).toEqual(expected);
    expect(helperText()).toContain(copy.picker.matches(expected.length));
  });

  it("[UP-5] 결과가 0이면 줄이 없고 안내 줄이 `noMatches`다", () => {
    render(<Host initial={null} />);
    openPicker();

    typeQuery("xyz");

    expect(rowCodes()).toEqual([]);
    expect(helperText()).toContain(copy.picker.noMatches);
  });

  it("[UP-6] 결과 수 낭독은 입력이 멈춘 뒤 한 번이고, 그 사이 다시 치면 마지막 것만 나간다", () => {
    vi.useFakeTimers();
    const announced = stubAnnounceHost();
    render(<Host initial={null} />);
    openPicker();

    typeQuery("ko");
    act(() => {
      vi.advanceTimersByTime(learnerCountryAnnounceDelayMs - 1);
    });
    expect(announced).toHaveLength(0);

    typeQuery("fr");
    act(() => {
      vi.advanceTimersByTime(learnerCountryAnnounceDelayMs - 1);
    });
    expect(announced).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(announced).toEqual([copy.picker.matches(port.search("fr").length)]);

    act(() => {
      vi.advanceTimersByTime(learnerCountryAnnounceDelayMs * 3);
    });
    expect(announced).toHaveLength(1);
  });

  it("[UP-6b] 결과가 0이면 낭독은 `noMatchesAnnouncement`다", () => {
    vi.useFakeTimers();
    const announced = stubAnnounceHost();
    render(<Host initial={null} />);
    openPicker();

    typeQuery("xyz");
    act(() => {
      vi.advanceTimersByTime(learnerCountryAnnounceDelayMs);
    });

    expect(announced).toEqual([copy.picker.noMatchesAnnouncement]);
  });

  it("[UP-7] 줄을 누르면 양식으로 돌아가 나라 줄에 그 나라가 서고 낭독이 1회이며, 다시 열면 질의가 비어 있다", () => {
    const announced = stubAnnounceHost();
    render(<Host initial={null} />);
    openPicker();
    typeQuery("fr");

    fireEvent.tap(row("FR"), {});

    expect(screen.queryByTestId("learner-country-picker")).toBeNull();
    expect(
      within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
        "ui-lynx-settings-cell",
      ),
    ).toHaveAttribute("accessibility-label", `${copy.countryLabel}, France`);
    expect(announced).toContain(copy.picker.countrySet("France"));
    expect(announced.filter((text) => text === copy.picker.countrySet("France"))).toHaveLength(1);

    openPicker();

    expect(rowCodes()).toHaveLength(countries.length);
    expect(helperText()).toContain(copy.picker.allCountries(countries.length));
  });

  it("[UP-8] 보이는 뒤로와 시스템 뒤로 모두 고르지 않고 양식으로 돌아간다", () => {
    render(<Host initial={{ name: "Emma", countryCode: "DE" }} />);
    openPicker();

    fireEvent.tap(
      within(screen.getByTestId("learner-country-picker-back")).getByTestId("ui-lynx-round-button"),
      {},
    );

    expect(screen.queryByTestId("learner-country-picker")).toBeNull();
    expect(
      within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
        "ui-lynx-settings-cell",
      ),
    ).toHaveAttribute("accessibility-label", `${copy.countryLabel}, Germany`);

    openPicker();
    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();

    expect(pressSystemBack()).toBe(true);

    expect(screen.queryByTestId("learner-country-picker")).toBeNull();
    expect(screen.getByTestId("learner-profile-fields")).toBeTruthy();
    expect(
      within(screen.getByTestId("ui-lynx-settings-group-item-country")).getByTestId(
        "ui-lynx-settings-cell",
      ),
    ).toHaveAttribute("accessibility-label", `${copy.countryLabel}, Germany`);
  });

  it("[UP-9] 글자가 있을 때만 지우기가 서고, 누르면 질의가 비어 전체 줄이 돌아온다", () => {
    render(<Host initial={null} />);
    openPicker();
    const picker = () => screen.getByTestId("learner-country-picker");
    expect(within(picker()).queryByTestId("ui-lynx-text-field-trailing-action")).toBeNull();

    typeQuery("fr");

    const clear = within(picker()).getByTestId("ui-lynx-text-field-trailing-action");
    expect(clear).toHaveAttribute("accessibility-label", copy.picker.clearSearch);
    expect(rowCodes()).not.toHaveLength(countries.length);

    fireEvent.tap(clear, {});

    expect(rowCodes()).toHaveLength(countries.length);
    expect(helperText()).toContain(copy.picker.allCountries(countries.length));
  });

  it("[UP-10] 빈 포트로 열어도 던지지 않고 줄이 0이다", () => {
    render(<Host initial={null} port={noLearnerProfilePort} />);

    openPicker();

    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();
    expect(rowCodes()).toEqual([]);
  });

  it("[UP-11] 목록 상자는 세로 스크롤이고 스크롤 바가 꺼져 있다", () => {
    render(<Host initial={null} />);
    openPicker();

    const list = screen.getByTestId("learner-country-picker-list");
    expect(list).toHaveAttribute("scroll-orientation", "vertical");
    expect(list).toHaveAttribute("scroll-bar-enable", "false");
  });
});
