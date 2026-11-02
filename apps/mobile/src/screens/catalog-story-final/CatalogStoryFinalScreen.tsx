import { useReducer, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { playSound } from "../../lib/sound-effects";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useAudioCue } from "../../lib/use-audio-cue";
import { useScreenBack } from "../../lib/use-back-handler";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import {
  canCheckStoryTiles,
  initialStoryFinalState,
  judgeStoryTiles,
  storyFinalAudioCueOf,
  storyFinalLineAccessibilityLabel,
  storyFinalReducer,
} from "./catalog-story-final";
import type { CatalogStoryFinalScreenProps } from "./catalog-story-final.contract";
import { StoryChoiceOptions, StoryReplyLine, StoryTilesBank } from "./StoryFinalAnswer";
import { StoryWritePad } from "./StoryWritePad";
import { useStoryTrace } from "./use-story-trace";

import "../catalog-final/catalog-final-screen.css";
import "./catalog-story-final-screen.css";

// 여정맵 이야기 파이널(level-3 S8)입니다 — RP 최종 테스트와 같은 껍데기(전면 장면 · 머리 · 상대 대사 · 어두운 답안 판)에
// 문항 갈래마다 답하는 방법만 다릅니다: 보기는 고르면 바로 판정, 타일은 Check, 따라 쓰기는 음절마다 Next letter.
// 판정 배지 · 해설 자리는 판정 전에도 높이를 지켜 판과 버튼이 흔들리지 않습니다. 낭독 순서 = DOM 순서입니다.
export function CatalogStoryFinalScreen({
  insets,
  ordinal,
  turns,
  onFinish,
  onExit,
}: CatalogStoryFinalScreenProps): ReactNode {
  const copy = useUiCopy();
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const [state, dispatch] = useReducer(storyFinalReducer, initialStoryFinalState);
  const [listens, setListens] = useState(0);
  const finished = useRef(false);

  const turn = turns[state.turnIndex] ?? turns[0];
  const checked = state.phase === "checked";
  const isLastTurn = state.turnIndex >= turns.length - 1;
  const result = checked ? (state.results[state.turnIndex] ?? null) : null;
  const syllableIndex = state.written.length;
  // 판정 뒤에도 쓰기 칸은 마지막 음절로 남습니다 — 칸이 사라지면 판 높이가 줄어 대화창이 밀립니다.
  const syllable =
    turn.kind === "write"
      ? (turn.syllables[Math.min(syllableIndex, turn.syllables.length - 1)] ?? "")
      : "";
  const trace = useStoryTrace(syllable, `${state.turnIndex}:${syllableIndex}`);
  const listenSource = turn.kind === "write" ? turn.replyAudioSource : undefined;
  const audio = useAudioCue(
    listens > 0 && listenSource !== undefined
      ? { key: `${state.turnIndex}:listen:${listens}`, source: listenSource }
      : storyFinalAudioCueOf(turn, state),
  );
  const previousImageUrl = turns[state.turnIndex - 1]?.imageUrl ?? null;

  const handleExit = () => {
    "background only";
    audio.stop();
    onExit();
  };
  useScreenBack(handleExit);

  const pick = (index: number) => {
    "background only";
    if (turn.kind !== "choice") return;
    dispatch({
      type: "pick",
      optionIndex: index,
      result: index === turn.correctIndex ? "correct" : "incorrect",
    });
  };
  const toggle = (tileIndex: number) => {
    "background only";
    playSound("button");
    dispatch({ type: "toggleTile", tileIndex });
  };

  const writeAction =
    turn.kind === "write" && !checked && (trace.strokes.length > 0 || !trace.graded)
      ? {
          label:
            syllableIndex >= turn.syllables.length - 1
              ? copy.common.check
              : copy.catalogStoryFinal.nextLetter,
          run: () => {
            "background only";
            trace.grade((passed) =>
              dispatch({ type: "writeSyllable", passed, total: turn.syllables.length }),
            );
          },
        }
      : null;
  const tilesAction =
    turn.kind === "tiles" && !checked && canCheckStoryTiles(state.placed)
      ? {
          label: copy.common.check,
          run: () => {
            "background only";
            dispatch({ type: "check", result: judgeStoryTiles(turn, state.placed) });
          },
        }
      : null;
  const action = checked
    ? {
        label: isLastTurn ? copy.common.seeResults : copy.common.next,
        run: () => {
          "background only";
          playSound("button");
          setListens(0);
          if (!isLastTurn) {
            dispatch({ type: "nextTurn" });
            return;
          }
          if (finished.current) return;
          finished.current = true;
          onFinish(state.results);
        },
      }
    : (writeAction ?? tilesAction);

  return (
    <view
      className="catalog-final-screen"
      data-testid="catalog-story-final"
      data-statusbar={lightStatusBarIcons}
      data-turnIndex={state.turnIndex}
      data-phase={state.phase}
    >
      <view className="catalog-final-screen-backdrop" />
      <view className="catalog-final-screen-scene" accessibility-elements-hidden={true}>
        {turn.imageUrl === null ? null : (
          <NarrativeBackground
            key={turn.imageUrl}
            src={turn.imageUrl}
            previousSrc={previousImageUrl}
            animated
            reducedMotion={reducedMotion}
          />
        )}
        <view className="catalog-final-screen-shade" />
      </view>

      <view
        className="catalog-final-screen-safe"
        flatten={false}
        style={{
          paddingTop: `${insets.top}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="catalog-final-screen-header">
          <view data-testid="catalog-story-final-back">
            <RoundButton
              accessibilityLabel={copy.common.exitTo.journey}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={handleExit}
            />
          </view>
          <view className="catalog-final-screen-header-text">
            <text
              className="catalog-final-screen-title"
              data-testid="catalog-story-final-title"
              accessibility-traits="header"
            >
              {`${copy.catalogMap.episodeLabel(ordinal)} ${copy.catalogMap.finalTitle}`}
            </text>
            <text
              className="catalog-final-screen-progress"
              data-testid="catalog-story-final-progress"
            >
              {copy.catalogFinal.turnProgress(state.turnIndex + 1, turns.length)}
            </text>
          </view>
        </view>

        <view className="catalog-final-screen-spacer" />

        <view
          className="catalog-final-screen-line"
          data-testid="catalog-story-final-line"
          accessibility-element={true}
          accessibility-traits="text"
          accessibility-label={storyFinalLineAccessibilityLabel(turn)}
        >
          <view accessibility-elements-hidden={true}>
            <VisualNovelDialog
              speakerName={turn.speakerName}
              line={turn.line.ko}
              translation={turn.line.en ?? turn.line.roman ?? undefined}
              reveal="instant"
              continueIndicator="off"
              surface="translucent"
              contentLanguage="learning"
              languageTag="ko"
              reducedMotion={reducedMotion}
            />
          </view>
        </view>

        <view className="catalog-final-screen-panel">
          <scroll-view
            className="catalog-final-screen-panel-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            <view className="catalog-final-screen-panel-body catalog-story-final-body">
              <text
                className="catalog-final-screen-instruction"
                data-testid="catalog-story-final-instruction"
              >
                {turn.instruction}
              </text>
              {/* 판정 자리 — 안내 바로 아래 가운데, 불투명 배지(사용자 결정 2026-11-02). 비어 있어도 높이를 지킵니다. */}
              <view
                className="catalog-final-screen-verdict-slot catalog-story-final-verdict-slot"
                data-testid="catalog-story-final-verdict-slot"
              >
                {result === null ? null : <AnswerVerdict result={result} />}
              </view>
              <StoryReplyLine turn={turn} state={state} onToggle={toggle} />
              {turn.replyTranslation === null ? null : (
                <text className="catalog-final-screen-hint" data-testid="catalog-story-final-hint">
                  {copy.catalogFinal.replyHint(turn.replyTranslation)}
                </text>
              )}
              {/* 해설 자리 — 맞히면 해설, 틀리면 「Answer: 완성 문장」 한 줄. 비어 있어도 한 줄 높이를 지킵니다. */}
              <view
                className="catalog-story-final-note-slot"
                data-testid="catalog-story-final-note-slot"
              >
                {result === "correct" && turn.correctNote !== null ? (
                  <text className="catalog-story-final-note" data-testid="catalog-story-final-note">
                    {turn.correctNote}
                  </text>
                ) : result === "incorrect" ? (
                  <text
                    className="catalog-story-final-note catalog-story-final-answer"
                    data-testid="catalog-story-final-answer"
                  >
                    {copy.catalogFinal.correctAnswer(turn.answer)}
                  </text>
                ) : null}
              </view>
              {turn.kind === "choice" ? (
                <StoryChoiceOptions turn={turn} state={state} onPick={pick} />
              ) : null}
              {turn.kind === "tiles" ? (
                <StoryTilesBank turn={turn} state={state} onToggle={toggle} />
              ) : null}
            </view>
          </scroll-view>

          {turn.kind === "write" ? (
            <StoryWritePad
              syllable={syllable}
              trace={trace}
              onListen={listenSource === undefined ? null : () => setListens((count) => count + 1)}
            />
          ) : null}

          <view className="catalog-final-screen-action" data-testid="catalog-story-final-action">
            {action === null ? null : (
              <Button
                label={action.label}
                variant="brand"
                size="xl"
                width="fill"
                bindtap={action.run}
              />
            )}
          </view>
          <view style={{ height: `${insets.bottom}px` }} />
        </view>
      </view>
    </view>
  );
}
