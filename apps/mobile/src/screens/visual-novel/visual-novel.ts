import type {
  VisualNovelAdvanceOutcome,
  VisualNovelBeatId,
  VisualNovelBeatIndex,
  VisualNovelEntrySnapshot,
  VisualNovelExitOutcome,
  VisualNovelProgress,
  VisualNovelSessionAction,
  VisualNovelSessionState,
  VisualNovelStory,
  VisualNovelUnitId,
} from "./visual-novel.contract";

export { artworkFor } from "./visual-novel-artwork";

export const visualNovelStoryFor = (unitId: VisualNovelUnitId): VisualNovelStory => ({
  unitId,
  title: "카페에 도착한 지민",
  beats: [
    {
      index: 0,
      id: "arrive",
      backgroundId: "cafe-exterior-day",
      characterId: "jimin",
      characterPoseId: "jimin-neutral",
      speakerName: "지민",
      dialogue: "여기가 우리가 만나기로 한 카페예요.",
    },
    {
      index: 1,
      id: "find",
      backgroundId: "cafe-exterior-day",
      characterId: "jimin",
      characterPoseId: "jimin-smile",
      speakerName: "지민",
      dialogue: "2번 출구 오른쪽이라 금방 찾았죠?",
    },
    {
      index: 2,
      id: "enter",
      backgroundId: "cafe-exterior-day",
      characterId: "jimin",
      characterPoseId: "jimin-smile",
      speakerName: "지민",
      dialogue: "그럼 들어가서 같이 주문해 봐요.",
    },
  ],
});
export const initialVisualNovelProgress = (): VisualNovelProgress => ({
  status: "active",
  beatIndex: 0,
});
export const initialVisualNovelSessionState = (
  progress: VisualNovelProgress,
): VisualNovelSessionState =>
  progress.status === "completed"
    ? { mode: "final", beatIndex: 2, replaying: false }
    : { mode: "viewing", beatIndex: progress.beatIndex, replaying: false };
export const visualNovelSessionReducer = (
  state: VisualNovelSessionState,
  action: VisualNovelSessionAction,
): VisualNovelSessionState => {
  if (action.type === "replay")
    return state.mode === "final" ? { mode: "viewing", beatIndex: 0, replaying: true } : state;
  if (state.mode === "final") return state;
  return state.beatIndex === 0
    ? { ...state, beatIndex: 1 }
    : { mode: "final", beatIndex: 2, replaying: state.replaying };
};
export const currentVisualNovelBeat = (
  story: VisualNovelStory,
  session: VisualNovelSessionState,
): VisualNovelStory["beats"][number] => story.beats[session.beatIndex];
export const advanceVisualNovelProgress = (
  progress: VisualNovelProgress,
  reached: VisualNovelBeatIndex,
): VisualNovelProgress => {
  if (progress.status === "completed" || reached <= progress.beatIndex) return progress;
  return reached === 2
    ? { status: "completed", beatIndex: 2 }
    : { status: "active", beatIndex: reached };
};
export const didVisualNovelComplete = (
  before: VisualNovelProgress,
  after: VisualNovelProgress,
): boolean => before.status === "active" && after.status === "completed";
export const visualNovelCompletionStatus = (
  progress: VisualNovelProgress,
): "available" | "completed" => (progress.status === "completed" ? "completed" : "available");
export const visualNovelExitOutcome = (
  progress: VisualNovelProgress,
): "incomplete" | "completed" => (progress.status === "completed" ? "completed" : "incomplete");
export const visualNovelProgressLabel = (session: VisualNovelSessionState): string =>
  session.mode === "final" ? "이야기 완료" : `장면 ${session.beatIndex + 1} / 3`;
export const visualNovelCompletionAnnouncement = (
  _before: VisualNovelProgress,
  _after: VisualNovelProgress,
): "이야기 완료" => "이야기 완료";

export function advanceVisualNovel(
  session: VisualNovelSessionState,
  progress: VisualNovelProgress,
): VisualNovelAdvanceOutcome {
  const nextSession = visualNovelSessionReducer(session, { type: "advance" });
  const nextProgress = advanceVisualNovelProgress(progress, nextSession.beatIndex);
  const completedNow = didVisualNovelComplete(progress, nextProgress);

  return {
    session: nextSession,
    progress: nextProgress,
    progressChanged: nextProgress !== progress,
    completedNow,
    announcement: completedNow ? visualNovelCompletionAnnouncement(progress, nextProgress) : null,
  };
}

export function visualNovelEntrySnapshot(progress: VisualNovelProgress): VisualNovelEntrySnapshot {
  return {
    entryStatus: visualNovelCompletionStatus(progress),
    entryBeatId: progress.beatIndex === 0 ? "arrive" : progress.beatIndex === 1 ? "find" : "enter",
  };
}

// LIB-255 계약 §2.7: 롤플레이 출처의 시작 입력 — 여정 상태를 읽을 매개변수가 없다
// (계약 §6 ①). 연습은 늘 처음부터 선다.
export const practiceVisualNovelProgress = (): VisualNovelProgress => ({
  status: "active",
  beatIndex: 0,
});

// LIB-255 계약 §2.7: 연습 비주얼 노벨의 나가기 판정. 마지막 beat(`enter`)에 닿았으면
// `completed`, 그 밖(`arrive`·`find`)은 `incomplete`다.
export const practiceVisualNovelExitOutcome = (
  beatId: VisualNovelBeatId,
): VisualNovelExitOutcome => (beatId === "enter" ? "completed" : "incomplete");
