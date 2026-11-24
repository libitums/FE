import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, describe, expect, test } from "vitest";

import { VisualNovelDialog } from "./index";

// `ui` 계층: FE 확장 `romanization`(2026-11-24, 앱 ADR-0188) — 같은 날 개정(D7)으로 **대사 바로 아래 · 구분선 위** 한 줄이
// 됐습니다(한국어 → 로마자 → 구분선 → 번역). 번역처럼 대사가 다 드러난 뒤에만 보입니다.

afterEach(() => cleanup());

describe("VisualNovelDialog romanization", () => {
  test("VNR-U1. 순서는 대사 → 로마자 → 구분선 → 번역이고, 로마자는 번역 묶음 밖(구분선 위)이다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요."
        speakerName="점원"
        romanization="eoseo oseyo."
        translation="Welcome."
      />,
    );
    const line = screen.getByTestId("ui-lynx-visual-novel-dialog-line");
    const block = screen.getByTestId("ui-lynx-visual-novel-dialog-translation-block");
    const divider = screen.getByTestId("ui-lynx-visual-novel-dialog-divider");
    const roman = screen.getByTestId("ui-lynx-visual-novel-dialog-romanization");
    const translation = screen.getByTestId("ui-lynx-visual-novel-dialog-translation");
    const following = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(roman).toHaveTextContent("eoseo oseyo.");
    expect(block.contains(roman)).toBe(false);
    expect(following(line, roman)).toBe(true);
    expect(following(roman, divider)).toBe(true);
    expect(following(divider, translation)).toBe(true);
    expect(roman).toHaveStyle({ visibility: "visible" });
    expect(block).toHaveStyle({ visibility: "visible" });
  });

  test("VNR-U2. 번역 없이 로마자만 있으면 구분선 없이 로마자 줄만 서고, 쓰는 중에는 숨는다", () => {
    render(
      <VisualNovelDialog
        variant="narration"
        line="같이 가요."
        romanization="gachi gayo."
        reveal="typewriter"
        status="revealing"
        visibleCharacterCount={1}
      />,
    );
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-translation")).toBeNull();
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-translation-block")).toBeNull();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-romanization")).toHaveStyle({
      visibility: "hidden",
    });
  });

  test("VNR-U2b. 로마자를 빼도(끔) 대사 · 구분선 · 번역은 그대로 선다 — 로마자 줄만 빠진다", () => {
    render(<VisualNovelDialog line="어서 오세요." speakerName="점원" translation="Welcome." />);
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-romanization")).toBeNull();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-divider")).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent(
      "Welcome.",
    );
  });

  test("VNR-U3. 로마자가 없으면 이 확장 전 DOM 그대로다", () => {
    render(<VisualNovelDialog line="안녕" speakerName="이유나" translation="Hi" />);
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-romanization")).toBeNull();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent("Hi");
  });
});
