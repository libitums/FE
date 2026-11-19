import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { learnerProfilePort } from "../../lib/learner-profile-data";
import { UiCopyContext, uiCopyFor } from "../../lib/ui-copy";
import type { UiLanguage } from "../../lib/ui-copy.contract";
import { LearnerCountryScreen } from "./LearnerCountryScreen";
import { LearnerNameScreen } from "./LearnerNameScreen";
import { LearnerProfileSettingsScreen } from "./LearnerProfileSettingsScreen";

// `ui` 계층(LP-U1 ~ U3): 이름 · 나라 화면과 설정의 미리보기 뜻 줄이 화면 언어다(2026-11-19 l10n 점검 — 전에는 늘 영어). 실제 나라 표 ·
// 문장 틀(포트)을 쓰고 화면 언어만 바꿉니다. 고르기 목록의 영어 이름은 그대로입니다(ADR-0059 D4).

afterEach(cleanup);

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
