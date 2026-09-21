import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { entryLanguageLabel } from "../../lib/entry-language";
import { JourneyEntryScreen } from "./JourneyEntryScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 고른 언어의 라벨 반영·진행을 본다 (ADR-0006 D4).
//
// 계약: .agent-harness/work/lib-261/spec.md §0.5 A5(고른 언어 라벨을 그대로 한 줄 둔다) ·
//       §4.2~§4.5(구조·testid).
// 계획: .agent-harness/work/lib-261/test-plan.md ui §
//       `JourneyEntryScreen.ui.test.tsx` JE-U1~JE-U4.
//
// ⚠ 언어 라벨 반영(JE-U2)은 초기값 픽스처(`ko`)로는 공허하다(test-plan) — 화면이 prop을
// 무시하고 초기 언어를 그대로 보여도 우연히 참이 될 수 있다. 이 파일은 `en` 픽스처
// 하나로 전부 돈다.

const LANGUAGE = "en";

describe("JourneyEntryScreen (LIB-261)", () => {
  // JE-U1 — 본문(자리표)에는 §4.5 카탈로그에 별도 testid가 없다(그 밖의 새 testid를
  // 만들지 않는다). 제목·언어 줄·액션 셋의 존재와, 흐름 상자 전체에 그 셋을 넘는
  // 텍스트(본문)가 있다는 것으로 본다. n-3(보정 r0.3): 스크롤 상자에 accessibility-*가
  // 0건임을 얹는다(SP1과 같은 형태).
  it("[JE-U1] 제목·본문·액션이 선다", () => {
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} />);

    const title = screen.getByTestId("journey-entry-screen-title");
    const language = screen.getByTestId("journey-entry-screen-language");
    const start = screen.getByTestId("journey-entry-screen-start");
    const scroll = screen.getByTestId("journey-entry-screen-scroll");

    expect(title.textContent?.trim()).not.toBe("");
    expect(start).toBeInTheDocument();

    const knownText =
      (title.textContent ?? "") + (language.textContent ?? "") + (start.textContent ?? "");
    expect((scroll.textContent ?? "").length).toBeGreaterThan(knownText.length);

    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  // JE-U2 (en 픽스처)
  it("[JE-U2] 고른 언어의 라벨이 보인다", () => {
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} />);

    expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
      entryLanguageLabel(LANGUAGE),
    );
  });

  // JE-U3
  it("[JE-U3] 액션을 누르면 onEnter가 1회다", () => {
    const onEnter = vi.fn();
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={onEnter} />);

    fireEvent.tap(screen.getByTestId("journey-entry-screen-start"), {});

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  // JE-U4
  it("[JE-U4] 제목이 header다", () => {
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} />);

    expect(screen.getByTestId("journey-entry-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });
});
