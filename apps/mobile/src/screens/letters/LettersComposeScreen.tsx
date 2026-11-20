import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import play from "@libitums/icons/lynx/play";

import { announce, announceCompletion } from "../../lib/accessibility";
import { composeSyllable, jamoTileRomanOf } from "../../lib/letters/jamo";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { LearningShell } from "../learning/LearningShell";
import {
  COMPOSE_ROUNDS,
  COMPOSE_TILES,
  composeReducer,
  composeSlotStateOf,
  composeVerdictOf,
  initialComposeState,
  type ComposeAction,
  type ComposeState,
} from "./compose-quiz";
import { lettersTestIds as ids, type LettersComposeScreenProps } from "./letters.contract";

import "../syllable-build/syllable-build-tile.css";
import "./letters-compose.css";

// 합치기 퀴즈(ㄱ + ㅏ = 가)입니다(ADR-0169, 시안 JamoCompose). 뼈대는 레슨의 `LearningShell`(머리 캡션 · 판정 배지 · 아래 단추),
// 칸 · 타일은 음절 조립의 모양(syllable-build-tile)을 씁니다. 두 칸이 차면 합친 글자가 결과 칸에 서고 소리가 나며 곧바로 판정합니다 —
// 맞으면 Next(마지막은 완료), 틀리면 Try again. 레슨 기록 · 티켓과 무관한 연습입니다.
export function LettersComposeScreen({
  romanization,
  sound,
  onExit,
  onAnswered,
  onComplete,
}: LettersComposeScreenProps): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.more.compose;
  const [state, setState] = useState<ComposeState>(initialComposeState);
  const [hint, setHint] = useState(false);
  const round = COMPOSE_ROUNDS[state.round] ?? COMPOSE_ROUNDS[0]!;
  const target = composeSyllable(round.consonant, round.vowel);
  const verdict = state.done ? null : composeVerdictOf(state);
  const merged =
    state.consonant !== null && state.vowel !== null
      ? composeSyllable(state.consonant, state.vowel)
      : "";
  const showRoman = romanization === "shown";

  const playSyllable = (syllable: string) => {
    const source = sound.sourceOf(syllable);
    if (source !== null) sound.play(source);
  };

  const dispatch = (action: ComposeAction) => {
    const next = composeReducer(state, action);
    if (next === state) return;
    setState(next);
    if (action.type !== "pick") setHint(false);
    const judged = composeVerdictOf(next);
    if (
      action.type === "pick" &&
      judged !== null &&
      next.consonant !== null &&
      next.vowel !== null
    ) {
      playSyllable(composeSyllable(next.consonant, next.vowel));
      onAnswered?.(next.round + 1, target, judged === "correct");
      announce(uiCopy.common.resultAnnouncement(judged));
    }
    if (action.type === "next" && next.done) {
      onComplete?.(COMPOSE_ROUNDS.length, next.firstTry);
      announceCompletion(copy.complete);
    }
  };

  const action = state.done
    ? { label: copy.done, run: onExit }
    : verdict === "correct"
      ? { label: uiCopy.common.next, run: () => dispatch({ type: "next" }) }
      : verdict === "incorrect"
        ? { label: copy.tryAgain, run: () => dispatch({ type: "retry" }) }
        : undefined;

  const handlePlay = () => {
    "background only";
    playSyllable(target);
  };
  const handleHint = () => {
    "background only";
    playSound("button");
    setHint(true);
    announce(copy.hintText(jamoTileRomanOf(round.consonant)));
  };

  const slot = (which: "consonant" | "vowel") => {
    const value = which === "consonant" ? state.consonant : state.vowel;
    const slotState = state.done ? "empty" : composeSlotStateOf(state, which);
    const name = which === "consonant" ? copy.consonantSlot : copy.vowelSlot;
    return (
      <view
        className={`syllable-build-slot letters-compose-slot letters-compose-slot-${slotState}`}
        data-testid={ids.composeSlot(which === "consonant" ? "c" : "v")}
        data-state={slotState}
        accessibility-element={true}
        flatten={false}
        accessibility-label={`${name}, ${value ?? copy.emptySlot}`}
        accessibility-traits={value !== null && verdict === null ? "button" : "none"}
        bindtap={() => {
          "background only";
          if (value !== null) dispatch({ type: "clear", slot: which });
        }}
      >
        {value !== null && showRoman ? (
          <text className="tile-romanization">{jamoTileRomanOf(value)}</text>
        ) : null}
        <text className="syllable-tile-label">{value ?? ""}</text>
      </view>
    );
  };

  return (
    <view className="letters-compose" data-testid={ids.compose}>
      <LearningShell
        form="syllable-build"
        formLabel={copy.formLabel}
        questionIndex={state.round}
        questionCount={COMPOSE_ROUNDS.length}
        complete={state.done}
        instruction={copy.instruction}
        onExit={onExit}
        actionLabel={action?.label}
        onAction={action?.run}
        verdict={verdict ?? undefined}
        workspace={
          state.done ? undefined : (
            <view className="letters-compose-workspace">
              <view
                className="letters-compose-hint"
                data-testid={ids.composeHint}
                accessibility-element={true}
                flatten={false}
                accessibility-label={copy.hint}
                accessibility-traits="button"
                bindtap={handleHint}
              >
                <text className="letters-compose-hint-label">{copy.hint}</text>
              </view>
              {hint && verdict === null ? (
                <text className="letters-compose-hint-text" data-testid={ids.composeHintText}>
                  {copy.hintText(jamoTileRomanOf(round.consonant))}
                </text>
              ) : null}
              <view className="syllable-build-screen-bank letters-compose-bank">
                {COMPOSE_TILES.map((letter, index) => {
                  const used = letter === state.consonant || letter === state.vowel;
                  return (
                    <view
                      key={letter}
                      className={
                        used
                          ? "syllable-tile syllable-tile-placeholder syllable-tile-with-reading"
                          : "syllable-tile syllable-tile-bank syllable-tile-with-reading"
                      }
                      data-testid={ids.composeTile(index)}
                      accessibility-element={true}
                      flatten={false}
                      accessibility-label={`${letter}, ${jamoTileRomanOf(letter)}`}
                      accessibility-traits={used || verdict !== null ? "disabled" : "button"}
                      bindtap={() => {
                        "background only";
                        if (used) return;
                        playSound("button");
                        dispatch({ type: "pick", letter });
                      }}
                    >
                      {showRoman ? (
                        <text
                          className={
                            used
                              ? "tile-romanization syllable-tile-romanization-used"
                              : "tile-romanization"
                          }
                        >
                          {jamoTileRomanOf(letter)}
                        </text>
                      ) : null}
                      <text className="syllable-tile-label">{letter}</text>
                    </view>
                  );
                })}
              </view>
            </view>
          )
        }
        card={
          state.done ? (
            <text className="letters-compose-complete">{copy.complete}</text>
          ) : (
            <view className="letters-compose-card">
              <view className="letters-compose-target">
                <view
                  className="letters-compose-play"
                  data-testid={ids.composePlay}
                  accessibility-element={true}
                  flatten={false}
                  accessibility-label={copy.play}
                  accessibility-traits="button"
                  bindtap={handlePlay}
                >
                  <svg
                    className="letters-compose-play-icon"
                    content={play}
                    current-color={color.brand.primary}
                  />
                </view>
                <text className="letters-compose-make">{copy.make(round.roman)}</text>
              </view>
              <view className="letters-compose-slots">
                {slot("consonant")}
                <text className="letters-compose-op" accessibility-element={false}>
                  +
                </text>
                {slot("vowel")}
                <text className="letters-compose-op" accessibility-element={false}>
                  =
                </text>
                <view
                  className={`syllable-build-slot letters-compose-result${verdict === null ? "" : ` syllable-build-slot-${verdict}`}`}
                  data-testid={ids.composeSlot("r")}
                  accessibility-element={true}
                  flatten={false}
                  accessibility-label={`${copy.resultSlot}, ${merged === "" ? copy.emptySlot : merged}`}
                >
                  {merged === "" ? null : (
                    <>
                      {showRoman ? (
                        <text className="tile-romanization">
                          {`${jamoTileRomanOf(state.consonant ?? "")}${jamoTileRomanOf(state.vowel ?? "")}`}
                        </text>
                      ) : null}
                      <text className="syllable-tile-label letters-compose-merged">{merged}</text>
                    </>
                  )}
                </view>
              </view>
            </view>
          )
        }
      />
    </view>
  );
}
