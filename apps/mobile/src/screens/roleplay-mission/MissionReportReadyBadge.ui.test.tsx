import { afterEach, expect, test } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { createFakeMissionSource } from "./mission-fake-source";
import { missionListFixture } from "./mission-fixture";
import {
  missionReportBadgeOf,
  missionReportBadgeText,
  pendingReportOf,
} from "./mission-report-ready";
import { MissionReportReadyBadge } from "./MissionReportReadyBadge";
import { id } from "./mission-ui.test-support";
import { roleplayMissionEn } from "../../lib/ui-copy-roleplay-mission";

// `ui` 계층(RR-UI1 ~): 목록 카드의 「Report ready」 — 채점 대기 판(`pendingReports`)을 고르는 규칙과 표시 부품.

afterEach(() => {
  cleanup();
});

const now = (task: () => void) => task();

test("RR-UI1 채점 대기 판이 있는 미션만 표시 — 없으면 null, 채점 중인 판이면 grading", async () => {
  const list = await createFakeMissionSource({ schedule: now, pendingReport: true }).list();
  const pending = pendingReportOf(list, "u06-cafe");
  expect(pending).not.toBeNull();
  expect(missionReportBadgeOf(list, "u06-cafe")).toBe("ready");
  expect(missionReportBadgeOf(list, "u06-cafe", pending?.conversationId ?? null)).toBe("grading");
  expect(missionReportBadgeOf(list, "u01-water")).toBeNull();
  expect(missionReportBadgeOf(missionListFixture, "u06-cafe")).toBeNull();
  expect(missionReportBadgeOf(null, "u06-cafe")).toBeNull();
});

test("RR-UI2 표시 부품 — Report ready · Scoring…, 낭독은 카드가 묶어 읽게 숨긴다", () => {
  render(<MissionReportReadyBadge missionId="u06-cafe" state="ready" />);
  const badge = id("roleplay-mission-report-ready-u06-cafe");
  expect(badge).toHaveTextContent("Report ready");
  expect(badge).toHaveAttribute("data-state", "ready");
  expect(badge).toHaveAttribute("accessibility-elements-hidden", "true");
  cleanup();
  render(<MissionReportReadyBadge missionId="u06-cafe" state="grading" />);
  expect(id("roleplay-mission-report-ready-u06-cafe")).toHaveTextContent("Scoring…");
  expect(missionReportBadgeText("ready", roleplayMissionEn)).toBe("Report ready");
});
