import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import info02 from "@libitums/icons/lynx/info-02";
import { describe, expect, test, vi } from "vitest";

import { BackHeader, Button, RoundButton, StatusIndicator } from "./index";

describe("RoundButton", () => {
  test("접근성 이름·trait와 안정적인 data 속성을 노출한다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} variant="brand" size="l" />);

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveClass(
      "ui-lynx-round-button",
      "ui-lynx-round-button-brand",
      "ui-lynx-round-button-l",
    );
    expect(screen.getByTestId("ui-lynx-round-button-surface")).toBeInTheDocument();
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-label", "정보");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    expect(button).toHaveAttribute("data-variant", "brand");
    expect(button).toHaveAttribute("data-size", "l");
    expect(button).toHaveAttribute("data-disabled", "false");
    expect(button).toHaveAttribute("data-loading", "false");
  });

  test("icon content의 currentColor를 variant foreground로 해석해 Web에서도 색을 표시한다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} variant="brand" />);

    const icon = screen.getByTestId("ui-lynx-round-button-icon");
    expect(icon).toHaveAttribute("content", info02.replaceAll("currentColor", color.fg.brand));
    expect(icon.getAttribute("content")).not.toContain("currentColor");
    expect(icon).toHaveAttribute("current-color", color.fg.brand);
    expect(icon.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("loading은 icon을 spinner로 대체하고 spinner를 장식 자손으로 숨긴다", () => {
    render(<RoundButton accessibilityLabel="정보" icon={info02} loading={true} />);

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveAttribute("accessibility-label", "정보, 로딩 중");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveClass("ui-lynx-round-button-loading");
    expect(screen.queryByTestId("ui-lynx-round-button-icon")).not.toBeInTheDocument();
    const spinner = screen.getByTestId("ui-lynx-round-button-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("ui-lynx-round-button-spinner");
    expect(spinner.parentElement).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("활성 tap은 정확히 한 번 전달하고 loading·disabled tap은 차단한다", () => {
    const activeTap = vi.fn();
    const loadingTap = vi.fn();
    const disabledTap = vi.fn();

    const active = render(
      <RoundButton accessibilityLabel="활성" icon={info02} bindtap={activeTap} />,
    );
    fireEvent.tap(active.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    active.unmount();

    const loading = render(
      <RoundButton accessibilityLabel="로딩" icon={info02} loading={true} bindtap={loadingTap} />,
    );
    fireEvent.tap(loading.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    loading.unmount();

    const disabled = render(
      <RoundButton
        accessibilityLabel="비활성"
        icon={info02}
        disabled={true}
        bindtap={disabledTap}
      />,
    );
    fireEvent.tap(disabled.getByTestId("ui-lynx-round-button") as unknown as Element, {});
    expect(activeTap).toHaveBeenCalledTimes(1);
    expect(loadingTap).not.toHaveBeenCalled();
    expect(disabledTap).not.toHaveBeenCalled();
  });

  test("disabled+loading은 disabled semantics를 우선하고 spinner·결합 상태를 유지한다", () => {
    render(
      <RoundButton
        accessibilityLabel="업로드"
        icon={info02}
        variant="brand"
        disabled={true}
        loading={true}
      />,
    );

    const button = screen.getByTestId("ui-lynx-round-button");
    expect(button).toHaveAttribute("accessibility-traits", "disabled");
    expect(button).toHaveAttribute("accessibility-label", "업로드, 로딩 중");
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("data-loading", "true");
    expect(button).toHaveClass(
      "ui-lynx-round-button-brand",
      "ui-lynx-round-button-disabled",
      "ui-lynx-round-button-loading",
    );
    expect(screen.getByTestId("ui-lynx-round-button-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-round-button-icon")).not.toBeInTheDocument();
  });
});

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

    fireEvent.tap(screen.getByTestId("ui-lynx-button") as unknown as Element, {});
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  test("disabled는 callback을 막고 disabled trait을 노출한다", () => {
    const onTap = vi.fn();
    render(<Button bindtap={onTap} disabled={true} label="계속" />);

    const button = screen.getByTestId("ui-lynx-button");
    fireEvent.tap(button as unknown as Element, {});
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
  test("전체 leading tap과 분리된 접근성 뒤로가기 control을 제공한다", () => {
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

    fireEvent.tap(title as unknown as Element, {});
    fireEvent.tap(back as unknown as Element, {});
    fireEvent.tap(screen.getByTestId("ui-lynx-back-header-info") as unknown as Element, {});
    expect(onBack).toHaveBeenCalledTimes(2);
    expect(onInfo).toHaveBeenCalledTimes(1);
  });

  test("showInfo가 false면 정보 control을 렌더하지 않는다", () => {
    render(<BackHeader onBack={() => {}} title="설정" />);
    expect(screen.queryByTestId("ui-lynx-back-header-info")).not.toBeInTheDocument();
  });
});

describe("StatusIndicator", () => {
  test.each([
    ["completed", "완료"],
    ["in-progress", "진행 중"],
    ["needs-retry", "다시 시도"],
    ["locked", "잠김"],
  ] as const)("%s 상태를 색 외의 data-status와 라벨로 노출한다", (status, statusName) => {
    render(<StatusIndicator label="상태" status={status} />);
    const indicator = screen.getByTestId("ui-lynx-status-indicator");
    expect(indicator).toHaveAttribute("data-status", status);
    expect(indicator).toHaveAttribute("accessibility-label", `상태, ${statusName}`);
    expect(indicator).toHaveTextContent("상태");
  });

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
