import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import {
  SentenceOrderChip,
  SentenceOrderChipPlaceholder,
} from "../sentence-order/SentenceOrderChip";
import { storyReplyText, storyTemplateParts } from "./catalog-story-final";
import type {
  StoryFinalChoiceTurn,
  StoryFinalState,
  StoryFinalTilesTurn,
  StoryFinalTurn,
  StoryFinalWriteTurn,
} from "./catalog-story-final.contract";

// 이야기 파이널 답안 판의 조각입니다 — 내 대답 줄 · 보기 · 타일 창고 · 음절 칸. 상태는 화면이 들고 여기는 그리기만
// 합니다(쓰기 칸은 스크롤 밖에 서야 해서 화면이 따로 둡니다).

type OptionState = "idle" | "correct" | "incorrect" | "dim";

function optionStateOf(
  turn: StoryFinalChoiceTurn,
  state: StoryFinalState,
  index: number,
): OptionState {
  if (state.phase !== "checked") return "idle";
  if (index === state.picked) return index === turn.correctIndex ? "correct" : "incorrect";
  return "dim";
}

export function StoryChoiceOptions({
  turn,
  state,
  onPick,
}: {
  readonly turn: StoryFinalChoiceTurn;
  readonly state: StoryFinalState;
  readonly onPick: (index: number) => void;
}): ReactNode {
  return (
    <view className="catalog-story-final-options" data-testid="catalog-story-final-options">
      {turn.options.map((option, index) => {
        const optionState = optionStateOf(turn, state, index);
        return (
          <view
            key={index}
            className={`catalog-story-final-option catalog-story-final-option-${optionState}`}
            data-testid={`catalog-story-final-option-${index}`}
            data-state={optionState}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={option.ko}
            bindtap={() => onPick(index)}
          >
            <text className="catalog-story-final-option-text">{option.ko}</text>
          </view>
        );
      })}
    </view>
  );
}

export function StoryTilesBank({
  turn,
  state,
  onToggle,
}: {
  readonly turn: StoryFinalTilesTurn;
  readonly state: StoryFinalState;
  readonly onToggle: (index: number) => void;
}): ReactNode {
  const locked = state.phase === "checked";
  return (
    <view className="catalog-story-final-bank" data-testid="catalog-story-final-bank">
      {turn.tiles.map((tile, index) =>
        state.placed.includes(index) ? (
          <SentenceOrderChipPlaceholder key={index} index={index} text={tile.ko} surface="dark" />
        ) : (
          <SentenceOrderChip
            key={index}
            index={index}
            text={tile.ko}
            placedOrdinal={null}
            disabled={locked}
            surface="dark"
            onTap={onToggle}
          />
        ),
      )}
    </view>
  );
}

function TemplateText({ text }: { readonly text: string }): ReactNode {
  return text === "" ? null : <text className="catalog-story-final-reply-text">{text}</text>;
}

function WriteCells({
  turn,
  state,
}: {
  readonly turn: StoryFinalWriteTurn;
  readonly state: StoryFinalState;
}): ReactNode {
  const copy = useUiCopy().catalogStoryFinal;
  const total = turn.syllables.length;
  return (
    <view className="catalog-story-final-cells">
      {turn.syllables.map((syllable, index) => {
        const kind =
          index < state.written.length
            ? "written"
            : index === state.written.length
              ? "writing"
              : "empty";
        const label = copy.letterLabel(
          index + 1,
          total,
          kind === "written" ? { kind, syllable } : { kind },
        );
        return (
          <view
            key={index}
            className={`catalog-story-final-cell catalog-story-final-cell-${kind}`}
            data-testid={`catalog-story-final-cell-${index}`}
            data-state={kind}
            accessibility-element={true}
            accessibility-label={label}
          >
            <text className="catalog-story-final-cell-text">
              {kind === "written" ? syllable : ""}
            </text>
          </view>
        );
      })}
    </view>
  );
}

/** 내 대답 줄 — 틀의 빈칸 자리에 고른 보기 · 놓은 타일 · 음절 칸이 섭니다. */
export function StoryReplyLine({
  turn,
  state,
  onToggle,
}: {
  readonly turn: StoryFinalTurn;
  readonly state: StoryFinalState;
  readonly onToggle: (index: number) => void;
}): ReactNode {
  const copy = useUiCopy().catalogFinal;
  const text = storyReplyText(turn, state);
  const empty =
    turn.kind === "tiles"
      ? state.placed.length === 0
      : turn.kind === "choice" && state.picked === null;
  const { before, after } = storyTemplateParts(turn.template);
  return (
    <view
      className="catalog-story-final-reply"
      data-testid="catalog-story-final-reply"
      accessibility-element={turn.kind === "choice" || empty}
      accessibility-label={empty ? copy.replyEmpty : copy.replyLabel(text)}
    >
      {turn.kind === "choice" ? (
        // 고르기 전 틀은 빈칸 자리를 밑줄로 긋습니다(타일과 같은 모양). 고른 뒤 · 틀이 없으면 글 한 줄입니다.
        state.picked === null && turn.template !== null ? (
          <>
            <TemplateText text={before} />
            <view className="catalog-story-final-reply-blank" />
            <TemplateText text={after} />
          </>
        ) : (
          <text className="catalog-story-final-reply-text">{text}</text>
        )
      ) : turn.kind === "tiles" ? (
        <>
          <TemplateText text={before} />
          {state.placed.length === 0 ? (
            <view className="catalog-story-final-reply-blank" />
          ) : (
            state.placed.map((tileIndex, position) => (
              <SentenceOrderChip
                key={tileIndex}
                index={tileIndex}
                text={turn.tiles[tileIndex]?.ko ?? ""}
                placedOrdinal={position + 1}
                disabled={state.phase === "checked"}
                surface="dark"
                onTap={onToggle}
              />
            ))
          )}
          <TemplateText text={after} />
        </>
      ) : (
        <>
          <TemplateText text={before} />
          <WriteCells turn={turn} state={state} />
          <TemplateText text={after} />
        </>
      )}
    </view>
  );
}
