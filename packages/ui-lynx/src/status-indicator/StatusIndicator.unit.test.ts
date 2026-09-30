import { describe, expect, test } from "vitest";

import { getStatusIndicatorLabel, statusIndicatorNames } from "./index";

describe("StatusIndicator label", () => {
  test("보이는 라벨이 상태 이름이면 중복하지 않는다", () => {
    expect(getStatusIndicatorLabel({ label: "Completed", status: "completed" })).toBe("Completed");
  });

  test.each([
    ["completed", "Completed"],
    ["in-progress", "In progress"],
    ["needs-retry", "Try again"],
    ["locked", "Locked"],
  ] as const)("%s 상태를 임의 라벨과 구분되는 접근성 이름에 포함한다", (status, name) => {
    expect(getStatusIndicatorLabel({ label: "Status", status })).toBe(`Status, ${name}`);
  });

  test("공개 상태 이름 표가 영어 넷이다", () => {
    expect(statusIndicatorNames).toEqual({
      completed: "Completed",
      "in-progress": "In progress",
      "needs-retry": "Try again",
      locked: "Locked",
    });
  });

  test("문맥, 보이는 라벨, 표준 상태 이름을 한 접근성 이름으로 결합한다", () => {
    expect(
      getStatusIndicatorLabel({
        contextLabel: "Step 3",
        label: "Try once more",
        status: "needs-retry",
      }),
    ).toBe("Step 3, Try once more, Try again");
  });

  test("statusName이 있으면 기본 영어 상태 이름 대신 그것을 읽는다", () => {
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
    ).toBe("Learning, In progress");
  });
});
