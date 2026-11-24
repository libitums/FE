import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import play from "@libitums/icons/lynx/play";
import { useMotion } from "@libitums/ui-lynx/motion";

import { COMPOSE_TILES, composeSlotStateOf } from "../lib/letters/compose-quiz";
import { composeSyllable, jamoTileRomanOf } from "../lib/letters/jamo";
import type { ChoiceRomanization } from "../lib/session-options";
import { playSound } from "../lib/sound-effects";
import { useUiCopy } from "../lib/ui-copy";
import type { ComposeQuiz } from "./use-compose-quiz";

import "../screens/syllable-build/syllable-build-tile.css";
import "../screens/syllable-build/syllable-build-word.css";
import "./compose-quiz-parts.css";

// 합치기 퀴즈의 문제 줄(▶ + Make · 칸 + 칸 = 결과)과 타일 창고입니다(ADR-0169). Letters › Practice와 입장 전 기초
// (ADR-0176)가 함께 씁니다. 칸 · 타일은 음절 조립의 모양을 빌립니다.
//
// Android TalkBack: 평탄화된 글은 접근성 트리에서 빠지고, `accessibility-enable-tap`이 있는 View만 두 번 탭으로 눌립니다.

type ComposeQuizPartProps = {
  readonly quiz: ComposeQuiz;
  readonly romanization: ChoiceRomanization;
};

export function ComposeQuizCard({
  quiz,
  romanization,
  speaker = "ready",
}: ComposeQuizPartProps & {
  /** `unavailable`이면 ▶가 비활성입니다(소리가 없으면 약속하지 않음 — 두 화면 다 `sourceOf(target)`으로 정함). 기본 `ready`. */
  readonly speaker?: "ready" | "unavailable";
}): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.more.compose;
  const { state, round, verdict } = quiz;
  const { consonant, vowel } = state;
  const merged = consonant !== null && vowel !== null ? composeSyllable(consonant, vowel) : "";
  const mergedRoman = `${jamoTileRomanOf(consonant ?? "")}${jamoTileRomanOf(vowel ?? "")}`;
  const showRoman = romanization === "shown";
  const silent = speaker === "unavailable";

  const handlePlay = () => {
    "background only";
    quiz.playTarget();
  };

  const slot = (which: "consonant" | "vowel") => {
    const value = which === "consonant" ? consonant : vowel;
    const slotState = state.done ? "empty" : composeSlotStateOf(state, which);
    const name = which === "consonant" ? copy.consonantSlot : copy.vowelSlot;
    const clearable = value !== null && verdict === null;
    return (
      <view
        className={`syllable-build-slot letters-compose-slot letters-compose-slot-${slotState}`}
        data-testid={`compose-slot-${which === "consonant" ? "c" : "v"}`}
        data-state={slotState}
        accessibility-element={true}
        flatten={false}
        accessibility-label={
          value === null
            ? `${name}, ${copy.emptySlot}`
            : `${name}, ${value}, ${jamoTileRomanOf(value)}`
        }
        accessibility-traits={clearable ? "button" : "none"}
        accessibility-enable-tap={clearable}
        bindtap={() => {
          "background only";
          if (value !== null) quiz.dispatch({ type: "clear", slot: which });
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
    <view className="letters-compose-card">
      <view className="letters-compose-target">
        <view
          className={silent ? "letters-compose-play-silent" : "letters-compose-play"}
          data-testid="compose-play"
          accessibility-element={true}
          flatten={false}
          accessibility-label={
            silent ? `${copy.play}, ${uiCopy.more.letters.soundUnavailable}` : copy.play
          }
          accessibility-traits={silent ? "disabled" : "button"}
          accessibility-enable-tap={!silent}
          bindtap={handlePlay}
        >
          <svg
            className="letters-compose-play-icon"
            content={play}
            // brand.primary는 gray.100 면 위 2.84:1이라 비텍스트 기준(3:1)에 모자랍니다.
            current-color={silent ? color.fg.disabled : color.brand.strong}
          />
        </view>
        <text
          className="letters-compose-make"
          data-testid="compose-make"
          flatten={false}
          accessibility-element={true}
        >
          {copy.make(round.roman)}
        </text>
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
          data-testid="compose-slot-r"
          accessibility-element={true}
          flatten={false}
          accessibility-label={`${copy.resultSlot}, ${merged === "" ? copy.emptySlot : `${merged}, ${mergedRoman}`}`}
        >
          {merged === "" ? null : (
            <>
              {showRoman ? <text className="tile-romanization">{mergedRoman}</text> : null}
              <text className="syllable-tile-label letters-compose-merged">{merged}</text>
            </>
          )}
        </view>
      </view>
    </view>
  );
}

export function ComposeQuizBank({ quiz, romanization }: ComposeQuizPartProps): ReactNode {
  const usedTile = useUiCopy().syllableBuild.usedTile;
  const motionClass = useMotion() === "reduced" ? " syllable-tile-motion-reduced" : "";
  const { consonant, vowel } = quiz.state;
  return (
    <view className="syllable-build-screen-bank letters-compose-bank">
      {COMPOSE_TILES.map((letter, index) => {
        const used = letter === consonant || letter === vowel;
        const pickable = !used && quiz.verdict === null;
        const name = `${letter}, ${jamoTileRomanOf(letter)}`;
        return (
          <view
            key={letter}
            className={
              used
                ? "syllable-tile syllable-tile-placeholder syllable-tile-with-reading"
                : `syllable-tile syllable-tile-bank syllable-tile-with-reading${motionClass}`
            }
            data-testid={`compose-tile-${index}`}
            accessibility-element={true}
            flatten={false}
            accessibility-label={used ? usedTile(name) : name}
            accessibility-traits={pickable ? "button" : "disabled"}
            accessibility-enable-tap={pickable}
            bindtap={() => {
              "background only";
              if (used) return;
              playSound("button");
              quiz.dispatch({ type: "pick", letter });
            }}
          >
            {romanization === "shown" ? (
              <text
                className={
                  used ? "tile-romanization syllable-tile-romanization-used" : "tile-romanization"
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
  );
}
