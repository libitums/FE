import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { countryNamesKey, forgetCountryNames } from "../../lib/country-names";
import { learnerProfilePort } from "../../lib/learner-profile-data";
import { UiCopyContext, uiCopyFor } from "../../lib/ui-copy";
import type { UiLanguage } from "../../lib/ui-copy.contract";
import { LearnerCountryScreen } from "./LearnerCountryScreen";
import { LearnerNameScreen } from "./LearnerNameScreen";
import { LearnerProfileSettingsScreen } from "./LearnerProfileSettingsScreen";

// `ui` 계층(LP-U1 ~ U3): 이름 · 나라 화면과 설정의 미리보기 뜻 줄이 화면 언어다(2026-11-19 l10n 점검 — 전에는 늘 영어). 실제 나라 표 ·
// 문장 틀(포트)을 쓰고 화면 언어만 바꿉니다. 나라 이름 표는 기기 저장소(호스트 `StorageModule` 대역)에 받아 둔 버킷 파일에서 읽고,
// 없으면 영어 이름입니다(LP-U4). 고르기 목록의 영어 이름은 그대로입니다(ADR-0059 D4).

afterEach(() => {
  cleanup();
  forgetCountryNames();
  vi.unstubAllGlobals();
});

/** 그 언어의 나라 이름 표를 기기에 받아 둔 상태 — 원문은 버킷 원본(`docs/content/country-names`)입니다. */
function receivedCountryNames(language: string): void {
  const text = readFileSync(
    resolve(process.cwd(), `../../docs/content/country-names/${language}.json`),
    "utf8",
  );
  const data = new Map([[countryNamesKey(language), text]]);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => data.get(key) ?? null,
      set: (key: string, value: string) => void data.set(key, value),
      remove: (key: string) => void data.delete(key),
    },
  });
}

function inLanguage(language: UiLanguage, children: ReactNode) {
  render(<UiCopyContext.Provider value={uiCopyFor(language)}>{children}</UiCopyContext.Provider>);
}

test("LP-U1. 이름 화면(ja) — 뜻 줄이 일본어", () => {
  inLanguage(
    "ja",
    <LearnerNameScreen
      initialName="Emma"
      port={learnerProfilePort}
      onContinue={vi.fn()}
      onBack={vi.fn()}
    />,
  );
  const preview = screen.getByTestId("learner-name-screen-preview").textContent ?? "";
  expect(preview).toContain("Emma로 예약했어요.");
  expect(preview).toContain("Emmaの名前で予約しました。");
  expect(preview).not.toContain("I booked under");
});

test("LP-U2. 나라 화면(vi) — 뜻 줄의 나라 이름까지 베트남어", () => {
  receivedCountryNames("vi");
  inLanguage(
    "vi",
    <LearnerCountryScreen
      learnerName="Emma"
      initialCountryCode="VN"
      port={learnerProfilePort}
      onContinue={vi.fn()}
      onBack={vi.fn()}
    />,
  );
  const preview = screen.getByTestId("learner-country-screen-preview").textContent ?? "";
  expect(preview).toContain("Tôi đến từ Việt Nam.");
  expect(preview).not.toContain("I'm from");
});

test("LP-U3. 설정(es) — 미리보기 두 줄이 스페인어", () => {
  receivedCountryNames("es");
  inLanguage(
    "es",
    <LearnerProfileSettingsScreen
      record={{ name: "Emma", countryCode: "MX" }}
      port={learnerProfilePort}
      onSubmit={vi.fn()}
      onExit={vi.fn()}
    />,
  );
  const preview = screen.getByTestId("learner-profile-preview").textContent ?? "";
  expect(preview).toContain("Reservé a nombre de Emma.");
  expect(preview).toContain("Soy de México.");
});

test("LP-U4. 표를 아직 못 받았으면(받기 전 · 실패 · 오프라인) 문장은 베트남어, 나라는 영어 이름(관사 없이)", () => {
  inLanguage(
    "vi",
    <LearnerCountryScreen
      learnerName="Emma"
      initialCountryCode="US"
      port={learnerProfilePort}
      onContinue={vi.fn()}
      onBack={vi.fn()}
    />,
  );
  const preview = screen.getByTestId("learner-country-screen-preview").textContent ?? "";
  expect(preview).toContain("Tôi đến từ United States.");
});

test("LP-U5. 나라 화면(th · my) — 뜻 줄이 그 언어 문장 · 그 언어 나라 이름(ADR-0158 개정 2026-11-20)", () => {
  for (const [language, sentence] of [
    ["th", "มาจากไทย"],
    ["my", "ထိုင်းက လာပါတယ်။"],
  ] as const) {
    receivedCountryNames(language);
    inLanguage(
      language,
      <LearnerCountryScreen
        learnerName="Emma"
        initialCountryCode="TH"
        port={learnerProfilePort}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    const preview = screen.getByTestId("learner-country-screen-preview").textContent ?? "";
    expect(preview, language).toContain(sentence);
    expect(preview, language).not.toContain("I'm from");
    cleanup();
    forgetCountryNames();
  }
});
