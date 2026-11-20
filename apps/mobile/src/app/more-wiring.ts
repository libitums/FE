// 더보기 메뉴의 화면들(Letters · 합치기 퀴즈 · My words 셋)과 메뉴 자체의 결선입니다(ADR-0169) — 이동 · 소리 · 기기 단어장 · 이벤트.
// 화면은 스택을 모르고 「무엇이 일어났다」만 올립니다(ADR-0007 D3).

import type { Dispatch } from "@lynx-js/react";

import { playAudio } from "../lib/audio";
import { emitCompanionEvent } from "../lib/companion-events";
import { contentAudioSourceOf } from "../lib/content-audio";
import { loadLettersRecord, saveLettersRecord, withLettersOpened } from "../lib/letters-recommend";
import { SLOW_PLAYBACK_RATE } from "../lib/listen-pace";
import type { CompanionEventInput } from "../lib/companion-event.contract";
import type { MoreEvent } from "../lib/more-event.contract";
import {
  choiceRomanizationOf,
  type ChoiceRomanization,
  type SessionOptions,
} from "../lib/session-options";
import { wordbookCountsOf, withAnswer } from "../lib/wordbook";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { letterAudioSourceOf } from "../screens/letters/letters-audio";
import type { LetterSoundPort } from "../screens/letters/letters.contract";
import type { WordSoundPort } from "../screens/wordbook/wordbook.contract";
import type { SettingsEventSink } from "../screens/settings/settings.contract";
import type { EpisodeContent } from "./episode-content";
import { loadCurrentWordbook, todayLocal, updateCurrentWordbook } from "./learning-trail-port";
import { moreRootActions, moreRootOf } from "./nav-reducer";
import type { MoreRoot, Nav, NavAction } from "./nav-state";
import type { WordbookEntry } from "./wordbook-entries";

type WithoutCommon<T> = T extends unknown ? Omit<T, "surface" | "daysSinceFirstOpen"> : never;
export type MoreEventInput = WithoutCommon<MoreEvent>;

export type MoreWiring = {
  readonly romanization: ChoiceRomanization;
  readonly letterSound: LetterSoundPort;
  readonly wordSound: WordSoundPort;
  readonly emit: (event: MoreEventInput) => void;
  /** 메뉴 줄 — more 탭으로 가며 그 화면을 루트로(설정이면 `settings_opened`, Letters면 열어 본 기록). */
  readonly onSelectMoreRoot: (root: MoreRoot, nav: Nav) => void;
  /** 메뉴 카드를 열 때 — 단어장 줄의 수(배경 스레드에서 읽음). */
  readonly wordbookCounts: () => { readonly words: number; readonly due: number };
  readonly onOpenCompose: () => void;
  readonly onBack: () => void;
  readonly onOpenWord: (entry: WordbookEntry) => void;
  readonly onReview: (only: WordbookEntry | null) => void;
  readonly onReviewAnswer: (entry: WordbookEntry, correct: boolean) => void;
  /** Letters 추천 「Learn the letters」 — 더보기 › Letters(선택 C). */
  readonly onOpenLetters: () => void;
};

export type MoreWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeContent: EpisodeContent;
  readonly sessionOptions: SessionOptions;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly settingsEventSink: SettingsEventSink;
};

const noop = () => {};

function markLettersOpened(): void {
  const record = loadLettersRecord();
  const next = withLettersOpened(record);
  if (next !== record) saveLettersRecord(next);
}

export function moreWiring(args: MoreWiringArgs): MoreWiring {
  const { dispatch, episodeContent } = args;
  const emit = (event: MoreEventInput) =>
    emitCompanionEvent(args.episodeIntroEventSink, {
      ...event,
      surface: "learning",
    } as CompanionEventInput);
  const open = (root: MoreRoot) => {
    for (const action of moreRootActions(root)) dispatch(action);
  };
  return {
    romanization: choiceRomanizationOf(args.sessionOptions),
    letterSound: {
      sourceOf: (syllable) => letterAudioSourceOf(syllable, episodeContent),
      play: (source) => void playAudio(source, noop),
    },
    wordSound: {
      sourceOf: (entry) =>
        contentAudioSourceOf(entry.audioId ?? undefined, entry.ko, episodeContent.imageUrlOf),
      play: (source, slow) => void playAudio(source, noop, slow ? SLOW_PLAYBACK_RATE : undefined),
    },
    emit,
    onSelectMoreRoot: (root, nav) => {
      emit({ name: "more_menu_item_clicked", item: root });
      if (root === "settings" && (nav.tab !== "more" || moreRootOf(nav) !== "settings"))
        args.settingsEventSink?.({ name: "settings_opened" });
      if (root === "letters") markLettersOpened();
      if (root === "wordbook") {
        const counts = wordbookCountsOf(loadCurrentWordbook(), todayLocal());
        emit({ name: "wordbook_opened", words: String(counts.words), due: String(counts.due) });
      }
      open(root);
    },
    wordbookCounts: () => wordbookCountsOf(loadCurrentWordbook(), todayLocal()),
    onOpenCompose: () => dispatch({ type: "push", screen: { name: "letters-compose" } }),
    onBack: () => dispatch({ type: "back" }),
    onOpenWord: (entry) =>
      dispatch({
        type: "push",
        screen: { name: "wordbook-word", episodeId: entry.record.episodeId, ref: entry.record.ref },
      }),
    onReview: (only) =>
      dispatch({
        type: "push",
        screen: {
          name: "wordbook-review",
          only: only === null ? null : { episodeId: only.record.episodeId, ref: only.record.ref },
        },
      }),
    onReviewAnswer: (entry, correct) => {
      const today = todayLocal();
      updateCurrentWordbook((book) =>
        withAnswer(
          book,
          entry.record.episodeId,
          entry.record.ref,
          correct ? "correct" : "incorrect",
          today,
        ),
      );
      emit({ name: "wordbook_review_answered", correct });
    },
    onOpenLetters: () => {
      markLettersOpened();
      open("letters");
    },
  };
}
