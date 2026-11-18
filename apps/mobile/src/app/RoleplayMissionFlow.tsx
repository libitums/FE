// 롤플레이 미션 한 route의 흐름입니다 — 미리보기 → 대화 → (채점) → 리포트, 다시 하기는 미리보기로. 단계는 판의 상태
// (`MissionPhase`)가 정하고 route는 하나입니다(대본형 롤플레이와 같은 방식). 뒤로가기 · 그만두기 · 목록으로는 롤플레이 목록으로 나갑니다.

import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { SafeAreaInsets } from "../lib/safe-area";
import { missionCardOf } from "../screens/roleplay-mission/mission-model";
import { MissionPreviewScreen } from "../screens/roleplay-mission/MissionPreviewScreen";
import { MissionReportScreen } from "../screens/roleplay-mission/MissionReportScreen";
import { MissionTalkScreen } from "../screens/roleplay-mission/MissionTalkScreen";
import type {
  MissionCard,
  MissionList,
  MissionSource,
} from "../screens/roleplay-mission/roleplay-mission.contract";
import { useMissionSession } from "../screens/roleplay-mission/use-mission-session";

export type RoleplayMissionFlowProps = {
  readonly insets: SafeAreaInsets;
  readonly card: MissionCard;
  readonly source: MissionSource;
  readonly onExit: () => void;
  /** 리포트를 받았습니다 — 목록의 최고 기록을 다시 읽습니다. */
  readonly onReport: () => void;
};

export function RoleplayMissionFlow({
  insets,
  card,
  source,
  onExit,
  onReport,
}: RoleplayMissionFlowProps): ReactNode {
  const session = useMissionSession(source, card.item.id);
  const { state } = session;
  // 채점 실패 화면에서 다시 시도한 채점은 리포트 화면 위에서 기다립니다(대화로 돌아가지 않음).
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (state.phase === "abandoned") onExit();
    if (state.phase === "report") onReport();
    if (state.phase !== "grading") setRetrying(false);
  }, [state.phase]);

  switch (state.phase) {
    case "preview":
    case "starting":
      return (
        <MissionPreviewScreen
          insets={insets}
          card={card}
          starting={state.phase === "starting"}
          startError={state.startError}
          onStart={session.start}
          onExit={onExit}
        />
      );
    case "report":
    case "grading-failed":
      return (
        <MissionReportScreen
          insets={insets}
          card={card}
          report={state.report}
          gradingFailure={state.gradingFailure}
          grading={false}
          onRetryGrading={() => {
            setRetrying(true);
            session.retryGrading();
          }}
          onPlayAgain={session.reset}
          onExit={onExit}
        />
      );
    case "grading":
      if (retrying) {
        return (
          <MissionReportScreen
            insets={insets}
            card={card}
            report={null}
            gradingFailure={null}
            grading
            onRetryGrading={() => undefined}
            onPlayAgain={session.reset}
            onExit={onExit}
          />
        );
      }
      break;
    case "talking":
    case "awaiting":
    case "ended":
    case "abandoned":
      break;
  }
  return (
    <MissionTalkScreen
      insets={insets}
      card={card}
      state={state}
      onSend={session.send}
      onHint={session.hint}
      onDismissHint={session.dismissHint}
      onQuit={session.quit}
    />
  );
}

export type RoleplayMissionRouteProps = Omit<RoleplayMissionFlowProps, "card"> & {
  readonly missionId: string;
  readonly imageUrlOf: (episodeId: string) => string | null;
  readonly ordinalOf: (episodeId: string) => number | null;
};

/** route 입구 — 출처에서 목록을 읽어 미션 칸을 만든 뒤 흐름을 세웁니다. 읽는 동안은 짙은 바탕만 둡니다. */
export function RoleplayMissionRoute(props: RoleplayMissionRouteProps): ReactNode {
  const { missionId, imageUrlOf, ordinalOf, source } = props;
  const [list, setList] = useState<MissionList | null>(null);
  useEffect(() => {
    let alive = true;
    source.list().then(
      (value) => {
        if (alive) setList(value);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [source]);
  const card = list === null ? null : missionCardOf(list, missionId, imageUrlOf, ordinalOf);
  if (card === null) {
    return (
      <view className="roleplay-story-screen-backdrop" data-testid="roleplay-mission-loading" />
    );
  }
  return <RoleplayMissionFlow {...props} card={card} />;
}
