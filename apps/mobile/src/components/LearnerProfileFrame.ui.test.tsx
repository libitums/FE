import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import type { LearnerCountry, LearnerProfilePort } from "../lib/learner-profile.contract";
import { uiCopyEn } from "../lib/ui-copy-en";
import { LearnerCountryPicker } from "./LearnerCountryPicker";
import { LearnerProfileFields } from "./LearnerProfileFields";
import { LearnerProfileFrame } from "./LearnerProfileFrame";
import { useLearnerProfileForm } from "./use-learner-profile-form";

// `ui` 계층: 독립 화면의 뼈대(고정 머리 · 스크롤 · 고정 주 버튼)가 자리를 지키는지, 나라 고르기가 서는
// 동안 `data-view`가 갈리는지 봅니다. 머리 · 주 버튼의 내용은 변형 화면 테스트가 봅니다.

const countries: readonly LearnerCountry[] = [
  { code: "FR", ko: "프랑스", roman: "peurangseu", en: "France" },
  { code: "DE", ko: "독일", roman: "dogil", en: "Germany" },
];

const port: LearnerProfilePort = {
  search: () => countries,
  byCode: (code) => countries.find((country) => country.code === code) ?? null,
  randomName: () => "Leo",
  previewOf: () => ({
    kind: "example",
    lines: [{ ko: "Emma로 예약했어요.", en: "I booked under Emma." }],
  }),
};

function Host() {
  const form = useLearnerProfileForm({
    initial: null,
    port,
    emptyMessage: uiCopyEn.learnerProfile.nameIssue.empty,
  });
  return (
    <LearnerProfileFrame
      form={form}
      header={<view data-testid="host-header" />}
      footer={<view data-testid="host-footer" />}
    >
      {form.draft.view === "picker" ? (
        <LearnerCountryPicker form={form} />
      ) : (
        <LearnerProfileFields form={form} />
      )}
    </LearnerProfileFrame>
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

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("LearnerProfileFrame", () => {
  it("[FR-1] 머리 → 스크롤 → 주 버튼 행 순서로 서고 양식은 스크롤 안에 있다", () => {
    render(<Host />);

    const frame = screen.getByTestId("learner-profile-frame");
    const header = within(frame).getByTestId("host-header");
    const scroll = within(frame).getByTestId("learner-profile-scroll");
    const footer = within(frame).getByTestId("host-footer");
    // DOCUMENT_POSITION_FOLLOWING(4)입니다 — 테스트 환경에 `Node` 전역이 없어 값을 씁니다.
    const before = 4;
    expect(header.compareDocumentPosition(scroll) & before).toBeTruthy();
    expect(scroll.compareDocumentPosition(footer) & before).toBeTruthy();
    expect(within(scroll).getByTestId("learner-profile-fields")).toBeTruthy();
    expect(within(scroll).queryByTestId("host-header")).toBeNull();
    expect(within(scroll).queryByTestId("host-footer")).toBeNull();
  });

  it("[FR-2] 스크롤 상자는 세로이고 스크롤 바가 꺼져 있으며 접근성 속성이 없다", () => {
    render(<Host />);

    const scroll = screen.getByTestId("learner-profile-scroll");
    expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
    expect(scroll).toHaveAttribute("scroll-bar-enable", "false");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  it("[FR-3] `data-view`가 양식일 때 form, 나라 고르기가 서면 picker다", () => {
    render(<Host />);
    expect(screen.getByTestId("learner-profile-frame")).toHaveAttribute("data-view", "form");

    openPicker();

    expect(screen.getByTestId("learner-profile-frame")).toHaveAttribute("data-view", "picker");
    expect(screen.getByTestId("learner-country-picker")).toBeTruthy();
  });
});
