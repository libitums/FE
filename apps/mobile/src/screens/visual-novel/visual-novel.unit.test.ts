import { describe, expect, it } from "vitest";
import backgroundSource from "./assets/cafe/background-cafe-exterior-day.png";
import neutralSource from "./assets/cafe/character-jimin-neutral.png";
import smileSource from "./assets/cafe/character-jimin-smile.png";

import type {
  VisualNovelProgress,
  VisualNovelSessionState,
  VisualNovelStory,
} from "./visual-novel.contract";
import {
  advanceVisualNovel,
  advanceVisualNovelProgress,
  artworkFor,
  currentVisualNovelBeat,
  didVisualNovelComplete,
  initialVisualNovelProgress,
  initialVisualNovelSessionState,
  practiceVisualNovelExitOutcome,
  practiceVisualNovelProgress,
  visualNovelCompletionAnnouncement,
  visualNovelCompletionStatus,
  visualNovelExitOutcome,
  visualNovelProgressLabel,
  visualNovelSessionReducer,
  visualNovelStoryFor,
} from "./visual-novel";
import { uiCopyEn } from "../../lib/ui-copy-en";

const id = "cafe-arrival-visual-novel" as const;
const active0: VisualNovelProgress = { status: "active", beatIndex: 0 };
const active1: VisualNovelProgress = { status: "active", beatIndex: 1 };
const completed: VisualNovelProgress = { status: "completed", beatIndex: 2 };

describe("카페 도착 비주얼 노벨 순수 계약", () => {
  it("정확한 3-beat 순서·내용·artwork ID를 반환한다", () => {
    const expected: VisualNovelStory = {
      unitId: id,
      title: "Our Imagined Café",
      beats: [
        {
          index: 0,
          id: "arrive",
          backgroundId: "cafe-exterior-day",
          characterId: "jimin",
          characterPoseId: "jimin-neutral",
          speakerName: "Minseo",
          dialogue: "안녕하세요",
          context: "In my imagination, tomorrow arrives. Minseo greets me at the café.",
          translation: "Hello.",
          romanization: "annyeonghaseyo",
        },
        {
          index: 1,
          id: "find",
          backgroundId: "cafe-exterior-day",
          characterId: "jimin",
          characterPoseId: "jimin-smile",
          speakerName: "Minseo",
          dialogue: "물 좀 주세요",
          context: "We practice asking for water together. One small request.",
          translation: "Water, please.",
          romanization: "mul jom juseyo",
        },
        {
          index: 2,
          id: "enter",
          backgroundId: "cafe-exterior-day",
          characterId: "jimin",
          characterPoseId: "jimin-smile",
          speakerName: "Minseo",
          dialogue: "내일 만나요",
          context:
            "We say goodbye. Before landing, I’ll practice directions, then listen, speak, and trace one letter.",
          translation: "See you tomorrow.",
          romanization: "naeil mannayo",
        },
      ],
    };
    expect(visualNovelStoryFor(id)).toMatchObject(expected);
    expect(visualNovelStoryFor(id).beats.every((beat) => beat.reply?.dialogue)).toBe(true);
  });

  it("CE4 제목 · 화자 이름이 영어다 — 대사는 불변", () => {
    const story = visualNovelStoryFor(id);
    expect(story.title).toBe("Our Imagined Café");
    expect(story.beats.map((beat) => beat.speakerName)).toEqual(["Minseo", "Minseo", "Minseo"]);
    expect(story.beats.map((beat) => beat.dialogue)).toEqual([
      "안녕하세요",
      "물 좀 주세요",
      "내일 만나요",
    ]);
  });

  it("끝나는 전이만 story-complete 키를 내고 그 밖은 null이다", () => {
    const viewingLastBeat = { mode: "viewing", beatIndex: 1, replaying: false } as const;
    expect(advanceVisualNovel(viewingLastBeat, active1).announcement).toBe("story-complete");
    expect(
      advanceVisualNovel(initialVisualNovelSessionState(active0), active0).announcement,
    ).toBeNull();
  });

  it("초기 progress/session과 completed 복원이 계약대로 파생된다", () => {
    expect(initialVisualNovelProgress()).toEqual(active0);
    expect(initialVisualNovelSessionState(active0)).toEqual({
      mode: "viewing",
      beatIndex: 0,
      replaying: false,
    });
    expect(initialVisualNovelSessionState(active1)).toEqual({
      mode: "viewing",
      beatIndex: 1,
      replaying: false,
    });
    expect(initialVisualNovelSessionState(completed)).toEqual({
      mode: "viewing",
      beatIndex: 0,
      replaying: true,
    });
  });

  it("session advance는 0→1→마지막 진입이고 적용 불가는 같은 참조다", () => {
    const s0 = initialVisualNovelSessionState(active0);
    const s1 = visualNovelSessionReducer(s0, { type: "advance" });
    const final = visualNovelSessionReducer(s1, { type: "advance" });
    expect(s1).toEqual({ mode: "viewing", beatIndex: 1, replaying: false });
    expect(final).toEqual({ mode: "final", beatIndex: 2, replaying: false });
    expect(visualNovelSessionReducer(final, { type: "advance" })).toBe(final);
    expect(visualNovelSessionReducer(s0, { type: "replay" })).toBe(s0);
  });

  it("replay는 view만 arrive로 되돌리고 completed progress는 보존한다", () => {
    const final: VisualNovelSessionState = { mode: "final", beatIndex: 2, replaying: false };
    const replay = visualNovelSessionReducer(final, { type: "replay" });
    expect(replay).toEqual({ mode: "viewing", beatIndex: 0, replaying: true });
    expect(advanceVisualNovelProgress(completed, 0)).toBe(completed);
    expect(advanceVisualNovelProgress(completed, 2)).toBe(completed);
  });

  it("completed replay의 advance는 화면만 전진하고 App progress와 완료 부수효과는 늘리지 않는다", () => {
    const replay0 = visualNovelSessionReducer(initialVisualNovelSessionState(completed), {
      type: "replay",
    });
    const replay1 = advanceVisualNovel(replay0, completed);
    const replayFinal = advanceVisualNovel(replay1.session, replay1.progress);

    expect(replay1).toEqual({
      session: { mode: "viewing", beatIndex: 1, replaying: true },
      progress: completed,
      progressChanged: false,
      completedNow: false,
      announcement: null,
    });
    expect(replayFinal).toEqual({
      session: { mode: "final", beatIndex: 2, replaying: true },
      progress: completed,
      progressChanged: false,
      completedNow: false,
      announcement: null,
    });
  });

  it("artworkFor는 닫힌 세 ID를 번들러가 제공한 URL 그대로로 resolve한다", () => {
    expect(artworkFor("cafe-exterior-day")).toMatchObject({
      id: "cafe-exterior-day",
      kind: "background",
      source: backgroundSource,
    });
    expect(artworkFor("jimin-neutral")).toMatchObject({
      id: "jimin-neutral",
      kind: "character",
      characterId: "jimin",
      source: neutralSource,
    });
    expect(artworkFor("jimin-smile")).toMatchObject({
      id: "jimin-smile",
      kind: "character",
      characterId: "jimin",
      source: smileSource,
    });
  });

  it("현재 beat를 선택하고 progress는 최원점만 단조 갱신한다", () => {
    const story = visualNovelStoryFor(id);
    expect(currentVisualNovelBeat(story, initialVisualNovelSessionState(active0))).toEqual(
      story.beats[0],
    );
    expect(currentVisualNovelBeat(story, { mode: "final", beatIndex: 2, replaying: true })).toEqual(
      story.beats[2],
    );
    const p1 = advanceVisualNovelProgress(active0, 1);
    const p2 = advanceVisualNovelProgress(p1, 2);
    expect(p1).toEqual(active1);
    expect(p2).toEqual(completed);
    expect(advanceVisualNovelProgress(p1, 0)).toBe(p1);
    expect(advanceVisualNovelProgress(p1, 1)).toBe(p1);
  });

  it("완료는 active→completed 전이에서만 true이고 상태/이탈/label을 고정한다", () => {
    expect(didVisualNovelComplete(active0, active1)).toBe(false);
    expect(didVisualNovelComplete(active1, completed)).toBe(true);
    expect(didVisualNovelComplete(completed, completed)).toBe(false);
    expect(visualNovelCompletionStatus(active0)).toBe("available");
    expect(visualNovelCompletionStatus(completed)).toBe("completed");
    expect(visualNovelExitOutcome(active1)).toBe("incomplete");
    expect(visualNovelExitOutcome(completed)).toBe("completed");
    expect(
      visualNovelProgressLabel({ mode: "viewing", beatIndex: 0, replaying: false }, uiCopyEn),
    ).toBe("Scene 1 / 3");
    expect(
      visualNovelProgressLabel({ mode: "viewing", beatIndex: 1, replaying: true }, uiCopyEn),
    ).toBe("Scene 2 / 3");
    expect(
      visualNovelProgressLabel({ mode: "final", beatIndex: 2, replaying: true }, uiCopyEn),
    ).toBe("Story complete");
    expect(visualNovelCompletionAnnouncement(active1, completed)).toBe("story-complete");
  });
});

// -------------------------------------------------------------- 롤플레이 연습 입력
// `practiceVisualNovelProgress`는 여정 상태를 읽을 매개변수가 없습니다 — 연습은 늘
// 처음부터 섭니다.

describe("연습 비주얼 노벨 시작 입력", () => {
  it("V1. 연습 시작 입력이 처음 viewing 상태를 만든다 — arrive·장면 1 / 3", () => {
    const story = visualNovelStoryFor(id);
    const progress = practiceVisualNovelProgress();
    const session = initialVisualNovelSessionState(progress);

    expect(session).toEqual({ mode: "viewing", beatIndex: 0, replaying: false });
    expect(currentVisualNovelBeat(story, session).id).toBe("arrive");
    expect(visualNovelProgressLabel(session, uiCopyEn)).toBe("Scene 1 / 3");
  });

  it("V2. 연습 progress로 마지막 beat에 닿으면 completedNow가 true이고 이야기 완료를 발화한다", () => {
    const viewingLastBeat = { mode: "viewing", beatIndex: 1, replaying: false } as const;

    const outcome = advanceVisualNovel(viewingLastBeat, practiceVisualNovelProgress());

    expect(outcome.completedNow).toBe(true);
    expect(outcome.announcement).toBe("story-complete");
  });

  // V3 — replaying 여부가 completedNow 판정에 끼면 안 됩니다. V2와 같은 입력에
  // replaying만 true로 바꿔도 결과가 갈리지 않는다는 것을 봅니다.
  it("V3. 같은 호출을 replaying: true로 해도 회차마다 completedNow가 true다", () => {
    const viewingLastBeatReplay = { mode: "viewing", beatIndex: 1, replaying: true } as const;

    const outcome = advanceVisualNovel(viewingLastBeatReplay, practiceVisualNovelProgress());

    expect(outcome.completedNow).toBe(true);
  });
});

describe("practiceVisualNovelExitOutcome", () => {
  it("V4. arrive·find는 incomplete이고 enter는 completed다", () => {
    expect(practiceVisualNovelExitOutcome("arrive")).toBe("incomplete");
    expect(practiceVisualNovelExitOutcome("find")).toBe("incomplete");
    expect(practiceVisualNovelExitOutcome("enter")).toBe("completed");
  });
});
