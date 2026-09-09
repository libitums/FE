import { expect, it, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";
import { JourneyMapScreen } from "./JourneyMapScreen";

// 데이터 경계의 제목을 바꿔 화면이 자체 문구 대신 전달받은 값을 쓰는지 확인한다.
vi.mock("./journey-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./journey-map")>();
  return {
    ...actual,
    journeyMapItems: actual.journeyMapItems.map((item) =>
      item.kind === "special" ? { ...item, title: "검증용 메시지 제목" } : item,
    ),
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
    />,
  );
  const item = screen.getByTestId("journey-messenger-item-appointment-confirmation");
  expect(item).toHaveTextContent("검증용 메시지 제목");
  expect(item).toHaveAttribute("accessibility-label", "검증용 메시지 제목");
});
