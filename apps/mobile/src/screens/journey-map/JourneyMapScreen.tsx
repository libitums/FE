import { useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import notification from "@libitums/icons/lynx/notification";
import { color } from "@libitums/design-tokens";

import { JourneyStepNode } from "./JourneyStepNode";
import { MessengerMapItem } from "./MessengerMapItem";
import { PhoneCallMapItem } from "./PhoneCallMapItem";
import { VisualNovelMapItem } from "./VisualNovelMapItem";
import { StepSheet } from "./StepSheet";
import {
  findStep,
  initialStepSheetState,
  journeySteps,
  stepSheetReducer,
  stepStatusAt,
  journeyMapItems,
  journeyStepOrdinal,
  type JourneyStepId,
} from "./journey-map";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";

import "./journey-map-screen.css";

/** 진행은 모듈 상수가 아니라 `App`이 소유하고 props로 내립니다. */
export type JourneyMapScreenProps = {
  completedStepCount: number;
  onStartStep: (id: JourneyStepId) => void;
  completedMessengerUnitIds: readonly MessengerUnitId[];
  onStartMessengerUnit: (id: MessengerUnitId) => void;
  completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  completedVisualNovelUnitIds?: readonly VisualNovelUnitId[];
  onStartVisualNovelUnit?: (id: VisualNovelUnitId) => void;
  onOpenNotifications: () => void;
};

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 시트 열림 상태는 이 화면이 소유합니다 — `useReducer`로 순수 함수 `stepSheetReducer`를
// 소비합니다. `Nav`는 관여하지 않습니다.
export function JourneyMapScreen({
  completedStepCount,
  onStartStep,
  completedMessengerUnitIds,
  onStartMessengerUnit,
  completedPhoneCallUnitIds,
  onStartPhoneCallUnit,
  completedVisualNovelUnitIds = [],
  onStartVisualNovelUnit = () => {},
  onOpenNotifications,
}: JourneyMapScreenProps): ReactNode {
  const [sheetState, dispatch] = useReducer(stepSheetReducer, initialStepSheetState);

  const openStep =
    sheetState.openStepId === null ? undefined : findStep(journeySteps, sheetState.openStepId);

  return (
    <view className="journey-map-screen">
      {/* [고정] 머리 — 제목 · 알림 버튼(액션 래퍼 안)을 담습니다. */}
      <view className="journey-map-screen-header">
        <text
          data-testid="journey-map-screen-title"
          className="journey-map-screen-title"
          accessibility-traits="header"
        >
          여정 맵
        </text>
        {/* 액션 래퍼 — ADR-0016 D9: 시트가 열린 동안 조작 가능한 뒤쪽 노드(버튼)를
            가립니다. 가림 속성은 자손에 걸리므로(D5, `view.accessibilityElementsHidden`)
            버튼 자신이 아니라 버튼을 품은 이 래퍼에 붙입니다. 제목은 가리지 않습니다 —
            머리 전체에 붙이면 제목까지 가려집니다. */}
        <view
          className="journey-map-screen-actions"
          data-testid="journey-map-screen-actions"
          accessibility-elements-hidden={openStep !== undefined}
        >
          <view
            className="journey-map-screen-notifications"
            data-testid="journey-map-screen-notifications"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label="알림"
            bindtap={onOpenNotifications}
          >
            <view className="journey-map-screen-notifications-content">
              <svg
                className="journey-map-screen-notifications-icon"
                content={notification}
                current-color={color.fg["neutral-muted"]}
              />
              <text className="journey-map-screen-notifications-label">알림</text>
            </view>
          </view>
        </view>
      </view>
      {/* [흐름] 내용 슬롯 — 스크롤 컨테이너 하나가 맵 컨테이너를 감쌉니다. 가림
          속성(`accessibility-elements-hidden`)은 맵 컨테이너에 그대로 남습니다 —
          스크롤 컨테이너로 올리면 가리는 범위가 넓어집니다. `scroll-orientation`·
          `scroll-bar-enable`을 적습니다 — 안 적으면 초기값이 각각 가로·꺼짐이라
          세로 스크롤이 원리적으로 불가능합니다. accessibility-*를 붙이지 않습니다. */}
      <scroll-view
        className="journey-map-screen-scroll"
        data-testid="journey-map-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view
          className="journey-map-screen-map"
          data-testid="journey-map-screen-map"
          accessibility-elements-hidden={openStep !== undefined}
        >
          {journeyMapItems.map((item) =>
            item.kind === "special" ? (
              <MessengerMapItem
                key={item.id}
                id={item.id}
                title={item.title}
                status={completedMessengerUnitIds.includes(item.id) ? "completed" : "available"}
                onSelect={onStartMessengerUnit}
              />
            ) : item.kind === "phone-call" ? (
              <PhoneCallMapItem
                key={item.id}
                id={item.id}
                title={item.title}
                status={completedPhoneCallUnitIds.includes(item.id) ? "completed" : "available"}
                onSelect={onStartPhoneCallUnit}
              />
            ) : item.kind === "visual-novel" ? (
              <VisualNovelMapItem
                key={item.id}
                id={item.id}
                title={item.title}
                status={completedVisualNovelUnitIds.includes(item.id) ? "completed" : "available"}
                onSelect={onStartVisualNovelUnit}
              />
            ) : (
              <JourneyStepNode
                key={item.step.id}
                id={item.step.id}
                title={item.step.title}
                status={stepStatusAt(journeyStepOrdinal(item.step.id) - 1, completedStepCount)}
                onSelect={(id) => dispatch({ type: "openStep", stepId: id })}
              />
            ),
          )}
        </view>
      </scroll-view>
      {/* [겹침 레이어] 스크롤 밖, 화면 루트의 직계 자식입니다. */}
      {openStep === undefined ? null : (
        <StepSheet
          title={openStep.title}
          description={openStep.description}
          /* `시작`의 목적지는 이 화면이 정하지 않습니다 — 열린 스텝의 id를 그대로
             위로 올립니다. 화면 전환은 `App`의 것입니다. */
          onStart={() => onStartStep(openStep.id)}
          onClose={() => dispatch({ type: "closeSheet" })}
        />
      )}
    </view>
  );
}
