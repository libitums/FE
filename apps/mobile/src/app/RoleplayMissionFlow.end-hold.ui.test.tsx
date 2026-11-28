import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { createFakeMissionSource } from "../screens/roleplay-mission/mission-fake-source";
import {
  cafeCard,
  id,
  insets,
  maybe,
  tapButton,
  typeInto,
  voicePorts,
} from "../screens/roleplay-mission/mission-ui.test-support";
import { MISSION_END_HOLD_MS } from "../screens/roleplay-mission/use-mission-session";
import { RoleplayMissionFlow } from "./RoleplayMissionFlow";

// `ui` 계층(MEH-UI1): 턴으로 닫힌 판의 마무리(QA 7) — 마지막 목표가 체크되고 상대역 마무리 대사 · 끝 줄(위 띠 · 로그)이 보인 채
// 잠깐 머문 뒤 채점 → 리포트로 넘어갑니다(전에는 곧장 넘어가 끝 줄이 보이지 않았습니다).

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const settle = async () => {
  for (let i = 0; i < 6; i += 1) await act(async () => Promise.resolve());
};

test("MEH-UI1 모든 목표로 닫히면 「Mission complete!」 · 마무리 대사가 머문 뒤 리포트", async () => {
  vi.useFakeTimers();
  const source = createFakeMissionSource({ schedule: (task) => task() });
  render(
    <RoleplayMissionFlow
      insets={insets}
      card={cafeCard}
      source={source}
      voice={voicePorts()}
      pendingConversationId={null}
      onExit={() => undefined}
      onReport={() => undefined}
    />,
  );
  tapButton("roleplay-mission-preview-start");
  await settle();
  for (const text of ["아이스 아메리카노 한 잔 주세요", "포장이요", "카드로 할게요", "얼마예요?"]) {
    typeInto("roleplay-mission-input", text);
    typeInto("roleplay-mission-input", text, "confirm");
    await settle();
  }
  expect(id("roleplay-mission-talk")).toHaveAttribute("data-phase", "ended");
  expect(id("roleplay-mission-turns-left")).toHaveTextContent("Mission complete!");
  expect(id("roleplay-mission-status")).toHaveTextContent("Mission complete!");
  expect(id("roleplay-mission-goal-price")).toHaveAttribute("data-done", "true");
  expect(id("roleplay-mission-log")).toHaveTextContent("나오면 불러 드릴게요");
  expect(maybe("roleplay-mission-report")).not.toBeInTheDocument();
  await act(async () => {
    vi.advanceTimersByTime(MISSION_END_HOLD_MS);
  });
  await settle();
  expect(id("roleplay-mission-report")).toBeInTheDocument();
});
