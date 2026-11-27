import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { languageDownloadEn } from "../../lib/ui-copy-language-download";
import { LanguageDownloadSheet } from "./LanguageDownloadSheet";

// `ui` 계층: 언어 바꿈 받기 시트(ADR-0102 개정 ⟨언어 바꿈 받기⟩) — 받는 중(진행 · 크기 · 숨기기) · 오프라인(확인) · 실패(다시 시도 · 나중에).

const tap = (element: Element) => fireEvent.tap(element, {});
const action = (id: string) =>
  within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${id}`)).getByTestId("ui-lynx-button");
const handlers = () => ({ onHide: vi.fn(), onRetry: vi.fn(), onClose: vi.fn() });

describe("LanguageDownloadSheet", () => {
  test("LDS1. 받는 중이면 제목 · 진행 줄(끝낸 편 · 받을 편 · 크기) · 진행 막대 · 숨기기가 선다", () => {
    const props = handlers();
    render(
      <LanguageDownloadSheet
        state={{ kind: "downloading", done: 3, total: 12, bytes: 300 * 1024 }}
        {...props}
      />,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      languageDownloadEn.downloadingTitle,
    );
    expect(screen.getByTestId("language-download-progress")).toHaveTextContent("3 of 12 · 300 KB");
    expect(screen.getByTestId("language-download-fill").getAttribute("style")).toContain("25%");
    tap(action("hide"));
    expect(props.onHide).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test("LDS2. 오프라인이면 연결되면 받는다는 안내와 확인 하나가 서고, 진행 줄은 없다", () => {
    const props = handlers();
    render(<LanguageDownloadSheet state={{ kind: "offline" }} {...props} />);
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      languageDownloadEn.offlineTitle,
    );
    expect(screen.getByTestId("ui-lynx-bottom-sheet-description")).toHaveTextContent(
      languageDownloadEn.offlineBody,
    );
    expect(screen.queryByTestId("language-download-progress")).toBeNull();
    tap(action("ok"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test("LDS3. 실패면 다시 시도 · 나중에가 서고 각각 제 핸들러를 부른다", () => {
    const props = handlers();
    render(<LanguageDownloadSheet state={{ kind: "failed" }} {...props} />);
    expect(screen.getByTestId("ui-lynx-bottom-sheet-title")).toHaveTextContent(
      languageDownloadEn.failedTitle,
    );
    tap(action("retry"));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    tap(action("later"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
