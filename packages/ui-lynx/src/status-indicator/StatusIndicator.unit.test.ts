import { describe, expect, test } from "vitest";

import { getStatusIndicatorLabel } from "./index";

describe("StatusIndicator label", () => {
  test("보이는 라벨이 상태 이름이면 중복하지 않는다", () => {
    expect(getStatusIndicatorLabel({ label: "완료", status: "completed" })).toBe("완료");
  });

  test.each([
    ["completed", "완료"],
    ["in-progress", "진행 중"],
    ["needs-retry", "다시 시도"],
    ["locked", "잠김"],
  ] as const)("%s 상태를 임의 라벨과 구분되는 접근성 이름에 포함한다", (status, name) => {
    expect(getStatusIndicatorLabel({ label: "상태", status })).toBe(`상태, ${name}`);
  });

  test("문맥, 보이는 라벨, 표준 상태 이름을 한 접근성 이름으로 결합한다", () => {
    expect(
      getStatusIndicatorLabel({
        contextLabel: "3단계",
        label: "다시 해보기",
        status: "needs-retry",
      }),
    ).toBe("3단계, 다시 해보기, 다시 시도");
  });

  test("statusName이 있으면 기본 한국어 상태 이름 대신 그것을 읽는다", () => {
    expect(
      getStatusIndicatorLabel({
        label: "Learning",
        status: "in-progress",
        statusName: "In progress",
      }),
    ).toBe("Learning, In progress");
    expect(
      getStatusIndicatorLabel({ label: "Completed", status: "completed", statusName: "Completed" }),
    ).toBe("Completed");
    expect(
      getStatusIndicatorLabel({ label: "Learning", status: "in-progress", statusName: "  " }),
    ).toBe("Learning, 진행 중");
  });
});
