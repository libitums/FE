/**
 * `cafe-arrival-visual-novel` specification-only contract.
 *
 * Runtime story data, reducers, JSX, styles, image imports, and analytics wiring do not
 * belong in this file. Changes require specification re-freeze and a contract diff.
 */

import type { SafeAreaInsets } from "../../lib/safe-area";
import type { SpecialUnitEntrySource } from "../../lib/special-unit-entry-source";
import type { JourneyMapItemStatus } from "../journey-map/journey-map-units";

export type VisualNovelUnitId = "cafe-arrival-visual-novel";
export type VisualNovelTitle = "Our Imagined Café";

export type VisualNovelBeatIndex = 0 | 1 | 2;
export type VisualNovelBeatId = "arrive" | "find" | "enter";
export type VisualNovelCharacterId = "jimin";
export type VisualNovelSpeakerName = string;
export type VisualNovelBackgroundId = "cafe-exterior-day";
export type VisualNovelCharacterPoseId = "jimin-neutral" | "jimin-smile";

export type ArriveVisualNovelBeat = {
  readonly index: 0;
  readonly id: "arrive";
  readonly backgroundId: "cafe-exterior-day";
  readonly characterId: "jimin";
  readonly characterPoseId: "jimin-neutral";
  readonly speakerName: "Minseo";
  readonly dialogue: string;
  readonly reply?: {
    readonly dialogue: string;
    readonly translation: string;
    readonly romanization?: string;
  };
  readonly context?: string;
  readonly translation?: string;
  readonly romanization?: string;
};

export type FindVisualNovelBeat = {
  readonly index: 1;
  readonly id: "find";
  readonly backgroundId: "cafe-exterior-day";
  readonly characterId: "jimin";
  readonly characterPoseId: "jimin-smile";
  readonly speakerName: "Minseo";
  readonly dialogue: string;
  readonly reply?: {
    readonly dialogue: string;
    readonly translation: string;
    readonly romanization?: string;
  };
  readonly context?: string;
  readonly translation?: string;
  readonly romanization?: string;
};

export type EnterVisualNovelBeat = {
  readonly index: 2;
  readonly id: "enter";
  readonly backgroundId: "cafe-exterior-day";
  readonly characterId: "jimin";
  readonly characterPoseId: "jimin-smile";
  readonly speakerName: "Minseo";
  readonly dialogue: string;
  readonly reply?: {
    readonly dialogue: string;
    readonly translation: string;
    readonly romanization?: string;
  };
  readonly context?: string;
  readonly translation?: string;
  readonly romanization?: string;
};

export type VisualNovelBeat = ArriveVisualNovelBeat | FindVisualNovelBeat | EnterVisualNovelBeat;

export type VisualNovelStory = {
  readonly unitId: VisualNovelUnitId;
  readonly title: VisualNovelTitle;
  readonly beats: readonly [ArriveVisualNovelBeat, FindVisualNovelBeat, EnterVisualNovelBeat];
};

/** App-session progress. Completed is structurally tied to the last beat. */
export type VisualNovelProgress =
  | { readonly status: "active"; readonly beatIndex: 0 | 1 }
  | { readonly status: "completed"; readonly beatIndex: 2 };

/** Screen-local viewing state. Replay never mutates persisted completion/progress. */
export type VisualNovelSessionState =
  | { readonly mode: "viewing"; readonly beatIndex: 0 | 1; readonly replaying: boolean }
  | { readonly mode: "final"; readonly beatIndex: 2; readonly replaying: boolean };

export type VisualNovelSessionAction = { readonly type: "advance" } | { readonly type: "replay" };

export type VisualNovelCompletionStatus = "available" | "completed";
export type VisualNovelExitOutcome = "incomplete" | "completed";

export type VisualNovelAssetPath =
  | "screens/visual-novel/assets/cafe/background-cafe-exterior-day.png"
  | "screens/visual-novel/assets/cafe/character-jimin-neutral.png"
  | "screens/visual-novel/assets/cafe/character-jimin-smile.png";

export type VisualNovelBackgroundAssetContract = {
  readonly id: "cafe-exterior-day";
  readonly kind: "background";
  readonly path: "screens/visual-novel/assets/cafe/background-cafe-exterior-day.png";
  readonly format: "png";
  readonly width: 941;
  readonly height: 1672;
  readonly aspectRatio: "941:1672";
  readonly transparency: "opaque";
};

export type VisualNovelCharacterAssetContract =
  | {
      readonly id: "jimin-neutral";
      readonly kind: "character";
      readonly characterId: "jimin";
      readonly path: "screens/visual-novel/assets/cafe/character-jimin-neutral.png";
      readonly format: "png";
      readonly width: 1086;
      readonly height: 1448;
      readonly aspectRatio: "3:4";
      readonly transparency: "alpha";
    }
  | {
      readonly id: "jimin-smile";
      readonly kind: "character";
      readonly characterId: "jimin";
      readonly path: "screens/visual-novel/assets/cafe/character-jimin-smile.png";
      readonly format: "png";
      readonly width: 1086;
      readonly height: 1448;
      readonly aspectRatio: "3:4";
      readonly transparency: "alpha";
    };

export type VisualNovelAssetContract =
  | VisualNovelBackgroundAssetContract
  | VisualNovelCharacterAssetContract;

/** Runtime artwork values are built once from the three static bundle imports. */
export type VisualNovelBackgroundArtwork = {
  readonly id: VisualNovelBackgroundId;
  readonly kind: "background";
  readonly source: string;
};

export type VisualNovelCharacterArtwork = {
  readonly id: VisualNovelCharacterPoseId;
  readonly kind: "character";
  readonly characterId: VisualNovelCharacterId;
  readonly source: string;
};

export type VisualNovelArtworkId = VisualNovelBackgroundId | VisualNovelCharacterPoseId;

export type VisualNovelArtworkBundle = {
  readonly "cafe-exterior-day": VisualNovelBackgroundArtwork & {
    readonly id: "cafe-exterior-day";
  };
  readonly "jimin-neutral": VisualNovelCharacterArtwork & {
    readonly id: "jimin-neutral";
  };
  readonly "jimin-smile": VisualNovelCharacterArtwork & {
    readonly id: "jimin-smile";
  };
};

export type VisualNovelArtworkResolver = <Id extends VisualNovelArtworkId>(
  id: Id,
) => VisualNovelArtworkBundle[Id];

export type VisualNovelAdvanceOutcome = {
  readonly session: VisualNovelSessionState;
  readonly progress: VisualNovelProgress;
  readonly progressChanged: boolean;
  readonly completedNow: boolean;
  readonly announcement: "story-complete" | null;
};

export type VisualNovelEntrySnapshot = {
  readonly entryStatus: VisualNovelCompletionStatus;
  readonly entryBeatId: VisualNovelBeatId;
};

/**
 * 열림 이벤트는 출처별 변형이 둘입니다 — 롤플레이 출처는 `entryStatus`·
 * `entryBeatId`를 싣지 않습니다. 그 밖 세 이벤트는 두 출처 모두 같은 모양입니다.
 */
export type VisualNovelEvent =
  | {
      readonly name: "visual_novel_unit_opened";
      readonly unitId: VisualNovelUnitId;
      readonly entrySource: "journey";
      readonly entryStatus: VisualNovelCompletionStatus;
      readonly entryBeatId: VisualNovelBeatId;
    }
  | {
      readonly name: "visual_novel_unit_opened";
      readonly unitId: VisualNovelUnitId;
      readonly entrySource: "roleplay";
    }
  | {
      readonly name: "visual_novel_unit_completed";
      readonly unitId: VisualNovelUnitId;
      readonly entrySource: SpecialUnitEntrySource;
    }
  | {
      readonly name: "visual_novel_unit_exited_incomplete";
      readonly unitId: VisualNovelUnitId;
      readonly beatId: VisualNovelBeatId;
      readonly entrySource: SpecialUnitEntrySource;
    }
  | {
      readonly name: "visual_novel_unit_replay_started";
      readonly unitId: VisualNovelUnitId;
      readonly entrySource: SpecialUnitEntrySource;
    };

export type VisualNovelEventSink = ((event: VisualNovelEvent) => void) | null;

export type VisualNovelAppProps = {
  readonly visualNovelEventSink?: VisualNovelEventSink;
};

export type VisualNovelMapItemProps = {
  readonly id: VisualNovelUnitId;
  readonly title: VisualNovelTitle;
  readonly status: JourneyMapItemStatus;
  readonly onSelect: (id: VisualNovelUnitId) => void;
};

export type VisualNovelScreenProps = {
  readonly insets?: SafeAreaInsets;
  readonly story: VisualNovelStory;
  readonly progress: VisualNovelProgress;
  readonly onAdvance: (id: VisualNovelUnitId, outcome: VisualNovelAdvanceOutcome) => void;
  readonly onExit: (outcome: VisualNovelExitOutcome, beatId: VisualNovelBeatId) => void;
  readonly onFinish: (id: VisualNovelUnitId) => void;
  readonly exitTo?: SpecialUnitEntrySource;
};

export type VisualNovelSceneProps = {
  readonly beat: VisualNovelBeat;
  readonly backgroundArtwork: VisualNovelBackgroundArtwork;
  readonly characterArtwork: VisualNovelCharacterArtwork;
  readonly replaying: boolean;
};

export type DialoguePanelAction =
  | { readonly kind: "advance"; readonly label: string; readonly onSelect: () => void }
  | {
      readonly kind: "finish";
      readonly label: string;
      readonly onSelect: () => void;
    };

export type DialoguePanelProps = {
  readonly speakerRole?: "partner" | "self";
  readonly beatId: VisualNovelBeatId;
  readonly speakerName: VisualNovelSpeakerName;
  readonly dialogue: VisualNovelBeat["dialogue"];
  readonly translation?: string;
  readonly romanization?: string;
  readonly action: DialoguePanelAction;
};

export type VisualNovelJourneyUnitContract = {
  readonly kind: "special";
  readonly id: VisualNovelUnitId;
  readonly title: VisualNovelTitle;
  readonly screen: "visual-novel";
};

export type VisualNovelJourneyMapItemContract = {
  readonly kind: "visual-novel";
  readonly id: VisualNovelUnitId;
  readonly title: VisualNovelTitle;
  readonly status: VisualNovelCompletionStatus;
};

export type VisualNovelNavigationScreenContract = {
  readonly name: "visual-novel";
  readonly unitId: VisualNovelUnitId;
};

export type VisualNovelTestId =
  | `ui-lynx-learning-unit-${VisualNovelUnitId}`
  | "visual-novel-screen"
  | "visual-novel-title"
  | "visual-novel-exit-button"
  | "visual-novel-progress"
  | `visual-novel-scene-${VisualNovelBeatId}`
  | `visual-novel-background-${VisualNovelBackgroundId}`
  | `visual-novel-character-${VisualNovelCharacterPoseId}`
  | `visual-novel-dialogue-${VisualNovelBeatId}`
  | "visual-novel-advance-button"
  | "visual-novel-finish-button";
