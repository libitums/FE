import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, describe, expect, test } from "vitest";

import { VisualNovelDialog } from "./index";

// `ui` 계층: FE 확장 `romanization`(2026-11-24, 앱 ADR-0188) — 번역 묶음 안에서 구분선 다음 · 번역 앞에 서는 한 줄이고,
// 번역처럼 대사가 다 드러난 뒤에만 보입니다.

afterEach(() => cleanup());

describe("VisualNovelDialog romanization", () => {
  test("VNR-U1. 로마자는 번역 묶음 안, 구분선 뒤 · 번역 앞에 선다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요."
        speakerName="점원"
        romanization="eoseo oseyo."
        translation="Welcome."
      />,
    );
    const block = screen.getByTestId("ui-lynx-visual-novel-dialog-translation-block");
    const roman = screen.getByTestId("ui-lynx-visual-novel-dialog-romanization");
    const translation = screen.getByTestId("ui-lynx-visual-novel-dialog-translation");
    expect(roman).toHaveTextContent("eoseo oseyo.");
    expect(block.contains(roman)).toBe(true);
    expect(
      roman.compareDocumentPosition(translation) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(block).toHaveStyle({ visibility: "visible" });
  });

  test("VNR-U2. 번역 없이 로마자만 있어도 묶음이 서고, 쓰는 중에는 숨는다", () => {
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
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-romanization")).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation-block")).toHaveStyle({
      visibility: "hidden",
    });
  });

  test("VNR-U3. 로마자가 없으면 이 확장 전 DOM 그대로다", () => {
    render(<VisualNovelDialog line="안녕" speakerName="이유나" translation="Hi" />);
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-romanization")).toBeNull();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent("Hi");
  });
});
