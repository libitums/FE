import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import info02 from "@libitums/icons/lynx/info-02";
import { describe, expect, test, vi } from "vitest";

import { BackHeader, Button, StatusIndicator } from "./index";

describe("Button", () => {
  test("variant, size, width와 접근성 계약을 속성으로 노출한다", () => {
    render(<Button label="계속" size="xl" variant="brand" width="fill" />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-variant", "brand");
    expect(button).toHaveAttribute("data-size", "xl");
    expect(button).toHaveAttribute("data-width", "fill");
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "계속");
    expect(button).toHaveAttribute("accessibility-traits", "button");
  });

  test("tap을 소비자 callback으로 전달한다", () => {
    const onTap = vi.fn();
    render(<Button bindtap={onTap} label="계속" />);

    fireEvent.tap(screen.getByTestId("ui-lynx-button"), {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test("disabled는 callback을 막고 disabled trait을 노출한다", () => {
    const onTap = vi.fn();
    render(<Button bindtap={onTap} disabled={true} label="계속" />);

    const button = screen.getByTestId("ui-lynx-button");
    fireEvent.tap(button, {});
    expect(onTap).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
  });

  test("loading은 라벨을 유지하고 상태 이름과 spinner를 제공한다", () => {
    render(<Button label="저장" loading={true} />);

    const button = screen.getByTestId("ui-lynx-button");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveAttribute("accessibility-label", "저장, 로딩 중");
    expect(screen.getByTestId("ui-lynx-button-label")).toHaveTextContent("저장");
    expect(screen.getByTestId("ui-lynx-button-spinner")).toBeInTheDocument();
  });
});

describe("BackHeader", () => {
  test("뒤로가기 묶음과 선택적 정보를 각각 하나의 control로 제공한다", () => {
    const onBack = vi.fn();
    const onInfo = vi.fn();
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
    expect(screen.getByTestId("ui-lynx-back-header-title")).toHaveTextContent("Episode 04");
    expect(screen.getByTestId("ui-lynx-back-header-subtitle")).toHaveTextContent(
      'Listening "저기요"',
    );
    expect(screen.getByTestId("ui-lynx-back-header-back-icon")).toHaveAttribute(
      "content",
      arrowLeft03,
    );
    expect(screen.getByTestId("ui-lynx-back-header-info-icon")).toHaveAttribute("content", info02);

    fireEvent.tap(back, {});
    fireEvent.tap(screen.getByTestId("ui-lynx-back-header-info"), {});
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onInfo).toHaveBeenCalledTimes(1);
  });

  test("showInfo가 false면 정보 control을 렌더하지 않는다", () => {
    render(<BackHeader onBack={() => {}} title="설정" />);
    expect(screen.queryByTestId("ui-lynx-back-header-info")).not.toBeInTheDocument();
  });
});

describe("StatusIndicator", () => {
  test.each(["completed", "in-progress", "needs-retry", "locked"] as const)(
    "%s 상태를 색 외의 data-status와 라벨로 노출한다",
    (status) => {
      render(<StatusIndicator label="상태" status={status} />);
      const indicator = screen.getByTestId("ui-lynx-status-indicator");
      expect(indicator).toHaveAttribute("data-status", status);
      expect(indicator).toHaveAttribute("accessibility-label", "상태");
      expect(indicator).toHaveTextContent("상태");
    },
  );

  test("문맥 이름을 접근성 이름에 결합하고 장식 점을 자손 가림으로 묶는다", () => {
    render(<StatusIndicator contextLabel="3단계" label="완료" status="completed" />);
    expect(screen.getByTestId("ui-lynx-status-indicator")).toHaveAttribute(
      "accessibility-label",
      "3단계, 완료",
    );
    expect(screen.getByTestId("ui-lynx-status-indicator-content")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });
});
