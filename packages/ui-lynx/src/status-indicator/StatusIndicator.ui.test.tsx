import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { StatusIndicator } from "./index";

describe("StatusIndicator UI", () => {
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
