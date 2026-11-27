import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type {
  LearnerCountry,
  LearnerProfilePort,
  LearnerProfileRecord,
} from "../../lib/learner-profile.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { LearnerCountryScreen } from "./LearnerCountryScreen";

// `ui` 계층: 가입 직후 ② 나라 — 전체 목록(첫 글자 머리) · 글자 막대 · 검색 · 고르기 · 미리보기 · 미선택 오류 ·
// Continue · 뒤로를 봅니다. 추천 줄 · 「기타」는 없습니다.

const copy = uiCopyEn.learnerProfile;

const countries: readonly LearnerCountry[] = [
  { code: "AL", ko: "알바니아", roman: "albania", en: "Albania" },
  { code: "AO", ko: "앙골라", roman: "anggolla", en: "Angola" },
  { code: "BR", ko: "브라질", roman: "beurajil", en: "Brazil" },
  { code: "DE", ko: "독일", roman: "dogil", en: "Germany" },
];

const port: LearnerProfilePort = {
  search: (query) => {
    const folded = query.trim().toLowerCase();
    return folded === ""
      ? countries
      : countries.filter((country) => country.en.toLowerCase().includes(folded));
  },
  byCode: (code) => countries.find((country) => country.code === code) ?? null,
  previewOf: (name, country) => ({
    kind: "yours",
    lines: [
      ...(name === null ? [] : [{ ko: `${name}`, en: `${name}` }]),
      ...(country === null
        ? []
        : [{ ko: `저는 ${country.ko}에서 왔어요.`, en: `I'm from ${country.en}.` }]),
    ],
  }),
  randomName: () => "Leo",
};

function renderScreen(initialCountryCode: string | null = null) {
  const onContinue = vi.fn<(record: LearnerProfileRecord) => void>();
  const onBack = vi.fn();
  render(
    <LearnerCountryScreen
      learnerName="Emma"
      initialCountryCode={initialCountryCode}
      port={port}
      onContinue={onContinue}
      onBack={onBack}
    />,
  );
  return { onContinue, onBack };
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

const tapContinue = () =>
  fireEvent.tap(
    within(screen.getByTestId("learner-country-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
const choose = (code: string) =>
  fireEvent.tap(screen.getByTestId(`learner-country-screen-row-${code}`), {});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
});

describe("LearnerCountryScreen", () => {
  it("LC1. 제목 · 진행 막대 2/3 · 검색 안내 · 전체 수 · 첫 글자 머리 셋 · 나라 넷이 선다", () => {
    renderScreen();

    expect(screen.getByTestId("learner-country-screen-title")).toHaveTextContent(
      copy.signup.country.title,
    );
    expect(screen.getByTestId("entry-step-bar")).toHaveAttribute(
      "accessibility-label",
      "Step 2 of 3",
    );
    expect(screen.getByTestId("learner-country-screen-count")).toHaveTextContent(
      "ALL COUNTRIES · 4",
    );
    for (const letter of ["A", "B", "G"]) {
      expect(screen.getByTestId(`learner-country-screen-letter-${letter}`)).toHaveTextContent(
        letter,
      );
      expect(screen.getByTestId(`learner-country-screen-jump-${letter}`)).toBeInTheDocument();
    }
    for (const country of countries) {
      expect(screen.getByTestId(`learner-country-screen-row-${country.code}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("learner-country-screen-preview")).not.toBeInTheDocument();
  });

  it("LC2. 나라를 고르면 미리보기에 그 나라 문장만 서고 Continue가 이름과 함께 기록을 낸다", () => {
    const { onContinue } = renderScreen();

    choose("BR");
    const row = screen.getByTestId("learner-country-screen-row-BR");
    expect(row).toHaveAttribute("data-selected", "true");
    expect(row).toHaveAttribute("accessibility-label", "Brazil · 브라질, selected");
    expect(screen.getByTestId("learner-country-screen-row-DE")).toHaveAttribute(
      "accessibility-label",
      "Germany · 독일",
    );
    const preview = screen.getByTestId("learner-country-screen-preview");
    expect(preview).toHaveTextContent("저는 브라질에서 왔어요.");
    expect(preview).not.toHaveTextContent("Emma");
    tapContinue();

    expect(onContinue).toHaveBeenCalledWith({ name: "Emma", countryCode: "BR" });
  });

  it("LC3. 고르지 않고 Continue하면 머물고 오류를 세우고 읽는다. 고르면 오류가 걷힌다", () => {
    const announced = stubAnnounceHost();
    const { onContinue } = renderScreen();

    tapContinue();
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByTestId("learner-country-screen-error")).toHaveTextContent(
      copy.countryMissing,
    );
    expect(announced).toEqual([copy.countryMissing]);

    choose("DE");
    expect(screen.queryByTestId("learner-country-screen-error")).not.toBeInTheDocument();
  });

  it("LC4. 처음 고른 값이 있으면 그 나라로 선다", () => {
    const { onContinue } = renderScreen("AO");

    expect(screen.getByTestId("learner-country-screen-preview")).toHaveTextContent("앙골라");
    tapContinue();
    expect(onContinue).toHaveBeenCalledWith({ name: "Emma", countryCode: "AO" });
  });

  it("LC5. 검색하면 결과 수 줄이 바뀌고 결과만 남고 글자 막대가 걷힌다", () => {
    renderScreen();

    typeQuery("an");

    expect(screen.getByTestId("learner-country-screen-count")).toHaveTextContent("3 matches");
    expect(screen.queryByTestId("learner-country-screen-row-BR")).not.toBeInTheDocument();
    expect(screen.getByTestId("learner-country-screen-row-AO")).toBeInTheDocument();
    expect(screen.queryByTestId("learner-country-screen-jump")).not.toBeInTheDocument();

    typeQuery("zz");
    expect(screen.getByTestId("learner-country-screen-count")).toHaveTextContent(
      copy.picker.noMatches,
    );
  });

  it("LC6. 글자 막대를 누르면 그 글자 머리로 목록을 내린다", () => {
    const calls: unknown[] = [];
    const original = lynx.createSelectorQuery;
    vi.spyOn(lynx, "createSelectorQuery").mockImplementation(() => {
      const query = original.call(lynx);
      const select = query.select.bind(query);
      query.select = (selector: string) => {
        const ref = select(selector);
        const invoke = ref.invoke.bind(ref);
        ref.invoke = (options: { method: string; params?: unknown }) => {
          calls.push({ selector, method: options.method, params: options.params });
          return invoke(options as never);
        };
        return ref;
      };
      return query;
    });
    renderScreen();

    fireEvent.tap(screen.getByTestId("learner-country-screen-jump-G"), {});

    expect(calls).toContainEqual({
      selector: "#learner-country-letter-G",
      method: "scrollIntoView",
      params: { scrollIntoViewOptions: { block: "start", behavior: "none" } },
    });
    vi.restoreAllMocks();
  });

  it("LC7. 보이는 뒤로 · 시스템 뒤로가 같은 onBack이다", () => {
    const { onBack } = renderScreen();

    fireEvent.tap(
      within(screen.getByTestId("learner-country-screen-back")).getByTestId("ui-lynx-round-button"),
      {},
    );
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(backHandlers.runTop()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
