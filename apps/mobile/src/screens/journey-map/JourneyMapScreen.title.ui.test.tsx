import { expect, it, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";
import { JourneyMapScreen } from "./JourneyMapScreen";

// 데이터 경계의 제목을 바꿔치기해, 화면이 자체 문구 대신 전달받은 값을 쓰는지 봅니다.
vi.mock("./journey-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./journey-map")>();
  return {
    ...actual,
    // 화면이 읽는 것은 구획(에피소드 + 그 항목들)입니다 — 평평한 목록이 아니라
    // 이쪽을 바꿔야 화면에 닿습니다.
    journeyMapSections: actual.journeyMapSections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.kind === "special" ? { ...item, title: "검증용 메시지 제목" } : item,
      ),
    })),
  };
});

it("특별 항목의 표시와 접근성 이름에 맵 데이터의 제목을 사용한다", () => {
  render(
    <JourneyMapScreen
      completedStepCount={2}
      onStartStep={vi.fn()}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={vi.fn()}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={vi.fn()}
      onOpenNotifications={vi.fn()}
    />,
  );
  const item = screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation");
  // 제목은 표식 아래 라벨과 접근성 이름 두 곳에 같은 값으로 실립니다. 이름 뒤의
  // 「이야기 연결」은 `LearningUnit`이 붙이는 것이라 제목과 무관합니다.
  expect(screen.getByText("검증용 메시지 제목")).toBeInTheDocument();
  expect(item).toHaveAttribute("accessibility-label", "검증용 메시지 제목, 이야기 연결");
});
