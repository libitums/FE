import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import info02 from "@libitums/icons/lynx/info-02";
import { describe, expect, test, vi } from "vitest";

import { BackHeader } from "./index";

describe("BackHeader UI", () => {
  test("전체 leading tap과 분리된 접근성 뒤로가기 control을 제공한다", () => {
    const onBack = vi.fn<() => void>();
    const onInfo = vi.fn<() => void>();
    render(
      <BackHeader
        onBack={onBack}
        onInfo={onInfo}
        showInfo={true}
        subtitle='Listening "저기요"'
        title="Episode 04"
      />,
    );

    const back = screen.getByTestId("ui-lynx-back-header-back");
    expect(back).toHaveAttribute("accessibility-label", "뒤로, Episode 04");
    expect(back).toHaveAttribute("accessibility-traits", "button");
    const title = screen.getByTestId("ui-lynx-back-header-title");
    expect(title).toHaveTextContent("Episode 04");
    expect(title).toHaveAttribute("accessibility-traits", "header");
    expect(back).not.toContainElement(title);
    expect(screen.getByTestId("ui-lynx-back-header-subtitle")).toHaveTextContent(
      'Listening "저기요"',
    );
    expect(screen.getByTestId("ui-lynx-back-header-back-icon")).toHaveAttribute(
      "content",
      arrowLeft03,
    );
    expect(screen.getByTestId("ui-lynx-back-header-info-icon")).toHaveAttribute("content", info02);

    fireEvent.tap(title, {});
    fireEvent.tap(back, {});
    fireEvent.tap(screen.getByTestId("ui-lynx-back-header-info"), {});
    expect(onBack).toHaveBeenCalledTimes(2);
    expect(onInfo).toHaveBeenCalledTimes(1);
  });

  test("showInfo가 false면 정보 control을 렌더하지 않는다", () => {
    render(<BackHeader onBack={() => {}} title="설정" />);
    expect(screen.queryByTestId("ui-lynx-back-header-info")).not.toBeInTheDocument();
  });
});
