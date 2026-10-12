import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { VisualNovelDialog } from "./index";

// `ui` 계층: 지문(aside) — 화자 줄과 대사 줄 사이에 서는 한 줄이고, 접근성 이름에 들어간다.
// 지문은 학습 언어(contentLanguage)와 무관하게 받은 글자 그대로 냅니다.

const aside = "딸랑거리는 문소리에 고개를 들며";

describe("VisualNovelDialog aside", () => {
  test("speech: 지문이 화자 줄과 대사 줄 사이에 선다", () => {
    render(<VisualNovelDialog line="어서 오세요." speakerName="점원" aside={aside} />);

    const speaker = screen.getByTestId("ui-lynx-visual-novel-dialog-speaker-row");
    const asideNode = screen.getByTestId("ui-lynx-visual-novel-dialog-aside");
    const line = screen.getByTestId("ui-lynx-visual-novel-dialog-line");
    expect(asideNode).toHaveTextContent(aside);
    expect(
      speaker.compareDocumentPosition(asideNode) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(asideNode.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("접근성 이름이 화자, 지문: 대사 순서로 읽힌다", () => {
    render(<VisualNovelDialog line="어서 오세요." speakerName="점원" aside={aside} />);

    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "accessibility-label",
      `점원, ${aside}: 어서 오세요.`,
    );
  });

  test("번역이 있으면 이름 끝에 이어 읽힌다", () => {
    render(
      <VisualNovelDialog
        line="어서 오세요."
        speakerName="점원"
        aside={aside}
        translation="Welcome."
      />,
    );

    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "accessibility-label",
      `점원, ${aside}: 어서 오세요. Welcome.`,
    );
  });

  test("thought: 지문이 선다", () => {
    render(
      <VisualNovelDialog variant="thought" line="목이 마르다." speakerName="Me" aside={aside} />,
    );

    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-aside")).toHaveTextContent(aside);
  });

  test("지문이 없으면 지문 요소도 이름 변화도 없다", () => {
    render(<VisualNovelDialog line="어서 오세요." speakerName="점원" />);

    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-aside")).not.toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "accessibility-label",
      "점원: 어서 오세요.",
    );
  });

  test("narration에는 지문 자리가 없다", () => {
    render(<VisualNovelDialog variant="narration" line="비가 내린다." />);

    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-aside")).not.toBeInTheDocument();
  });
});
