import type { AppJourneySeed } from "../journey-progress";
import { productJourneySeed } from "../journey-progress";

/** 특정 화면 테스트의 선행 완료 기록입니다. 제품 초기값을 바꾸지 않습니다. */
export function journeySeedBefore(id: string): AppJourneySeed {
  const order = [
    "greeting",
    "introduction",
    "ordering",
    "appointment",
    "appointment-confirmation",
    "appointment-confirmation-phone-call",
    "cafe-arrival-visual-novel",
    "directions",
    "tutorial-listening",
    "tutorial-speaking",
    "tutorial-writing",
    "tutorial-final-test",
  ];
  const index = order.indexOf(id);
  if (index < 0) throw new Error(`Unknown fixture unit: ${id}`);
  const standard = [
    "greeting",
    "introduction",
    "ordering",
    "appointment",
    "directions",
    "tutorial-listening",
    "tutorial-speaking",
    "tutorial-writing",
  ];
  const before = order.slice(0, index);
  return {
    ...productJourneySeed,
    completedStepCount: before.filter((unit) => standard.includes(unit)).length,
    completedMessengerUnitIds: before.includes("appointment-confirmation")
      ? ["appointment-confirmation"]
      : [],
    completedPhoneCallUnitIds: before.includes("appointment-confirmation-phone-call")
      ? ["appointment-confirmation-phone-call"]
      : [],
    visualNovelProgress: before.includes("cafe-arrival-visual-novel")
      ? { status: "completed", beatIndex: 2 }
      : productJourneySeed.visualNovelProgress,
  };
}
