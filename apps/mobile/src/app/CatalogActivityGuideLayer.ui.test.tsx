import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { useContext } from "@lynx-js/react";

import { backHandlers } from "../lib/back-handler";
import type { ActivityGuideSubject } from "../lib/learning-item-guide.contract";
import { stubGuideStorage } from "../lib/learning-item-guide.storage.test-support";
import { LearningGuideObscuredContext } from "../screens/learning/learning-guide-obscured";
import { CatalogActivityGuideLayer } from "./CatalogActivityGuideLayer";

// `ui` 계층: 활동 안내 층 — 판정(학습형 기준) · 기록 · 닫기 · 자식에게 「덮임」 알림 · 다시 풀기에서 끔(ADR-0104 D2 · D3).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
});

function Probe() {
  const obscured = useContext(LearningGuideObscuredContext);
  return <text data-testid="probe">{String(obscured)}</text>;
}

const listening: ActivityGuideSubject = {
  form: "listening",
  questionCount: 2,
  firstChipCount: null,
};

function layer(subject: ActivityGuideSubject, enabled = true) {
  return (
    <CatalogActivityGuideLayer subject={subject} enabled={enabled}>
      <Probe />
    </CatalogActivityGuideLayer>
  );
}

test("[LG1] 안 본 종류면 안내가 서고 자식에게 덮였다고 알린다", () => {
  stubGuideStorage();
  render(layer(listening));
  expect(screen.getByTestId("learning-item-guide-activity-listening")).toBeInTheDocument();
  expect(screen.getByTestId("probe")).toHaveTextContent("true");
});

test("[LG2] 탭하면 닫히고 그 종류가 기기에 적히며 자식은 덮이지 않음(false)", async () => {
  const storage = stubGuideStorage();
  render(layer(listening));
  await act(async () => {
    fireEvent.tap(screen.getByTestId("learning-item-guide-activity-listening"), {
      eventType: "catchEvent",
    });
  });
  expect(screen.queryByTestId("learning-item-guide-activity-listening")).toBeNull();
  expect(storage.savedKinds()).toEqual(["activity-listening"]);
  expect(screen.getByTestId("probe")).toHaveTextContent("false");
});

test("[LG3] 이미 본 종류면 안내가 없다", () => {
  stubGuideStorage({ seen: ["activity-listening"] });
  render(layer(listening));
  expect(screen.queryByTestId("learning-item-guide-activity-listening")).toBeNull();
  expect(screen.getByTestId("probe")).toHaveTextContent("false");
});

test("[LG4] 다시 풀기(enabled=false)에서는 안 본 종류여도 안내가 없고 층 밖과 같다", () => {
  stubGuideStorage();
  render(layer(listening, false));
  expect(screen.queryByTestId("learning-item-guide-activity-listening")).toBeNull();
  expect(screen.getByTestId("probe")).toHaveTextContent("undefined");
});

test("[LG5] 안내가 없는 학습형이면 안내가 없다", () => {
  stubGuideStorage();
  render(layer({ form: "typing", questionCount: 2, firstChipCount: null }));
  expect(screen.queryByTestId(/^learning-item-guide-/)).toBeNull();
  expect(screen.getByTestId("probe")).toHaveTextContent("undefined");
});

test("[LG6] 저장소가 없으면 띄우지 않는다", () => {
  vi.stubGlobal("NativeModules", {});
  render(layer(listening));
  expect(screen.queryByTestId("learning-item-guide-activity-listening")).toBeNull();
});
