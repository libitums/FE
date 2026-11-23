import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import volume from "@libitums/icons/lynx/volume";
import { Button } from "@libitums/ui-lynx/button";

import { ENTRY_BASICS_LETTERS, lettersHearable } from "../../lib/entry-basics";
import type { EntryBasicsLetter } from "../../lib/entry-basics";
import { useUiCopy } from "../../lib/ui-copy";
import { useLeaveOnce } from "../../lib/use-leave-once";
import { EntryBasicsFrame } from "./EntryBasicsFrame";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";
import type { EntryBasicsLettersScreenProps } from "./entry-basics.contract";

import "./entry-basics-letters.css";

// 글자 여섯 만나기입니다(ADR-0176, 시안 Letters). 소리 파일은 음성 정보 파일에 있을 때만 있는 것으로 봅니다(ADR-0173) —
// 없으면 「눌러서 들어 보세요」라고 말하지 않고 스피커가 비활성이며, 다음은 늘 갈 수 있습니다. 파일이 올라오면 그대로 들립니다.
export function EntryBasicsLettersScreen({
  sound,
  onNext,
  onBack,
  onSkip,
}: EntryBasicsLettersScreenProps): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.journeyEntry.firstSteps;
  const leave = useLeaveOnce();
  const [heard, setHeard] = useState<readonly string[]>([]);
  // 일본어는 문장 사이에 빈칸이 없습니다(「。」로 끝남).
  const gap = copy.lettersLead.slice(-1) === "。" ? "" : " ";
  const lead = lettersHearable((letter) => sound.letterSourceOf(letter))
    ? `${copy.lettersLead}${gap}${copy.lettersHear}`
    : copy.lettersLead;

  return (
    <EntryBasicsFrame
      testId={ids.letters}
      current={1}
      onBack={() => leave(onBack)}
      onSkip={() => leave(onSkip)}
      footer={
        <view className="entry-basics-next" data-testid={ids.next}>
          <Button
            label={copy.lettersNext}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={() => leave(onNext)}
          />
        </view>
      }
    >
      <text
        className="entry-basics-title"
        data-testid={ids.title}
        flatten={false}
        accessibility-element={true}
        accessibility-heading={true}
        accessibility-traits="header"
      >
        {copy.lettersTitle}
      </text>
      <text
        className="entry-basics-lead"
        data-testid={ids.lead}
        flatten={false}
        accessibility-element={true}
      >
        {lead}
      </text>
      <view className="entry-basics-middle">
        {(["consonants", "vowels"] as const).map((group) => (
          <view key={group} className="entry-basics-group">
            <text
              className="entry-basics-group-title"
              flatten={false}
              accessibility-element={true}
              accessibility-heading={true}
              accessibility-traits="header"
            >
              {uiCopy.more.letters.groups[group]}
            </text>
            <view className="entry-basics-row">
              {ENTRY_BASICS_LETTERS.map((letter, index) =>
                letter.group === group ? (
                  <LetterCell
                    key={letter.letter}
                    index={index}
                    letter={letter}
                    source={sound.letterSourceOf(letter.letter)}
                    heard={heard.indexOf(letter.letter) >= 0}
                    onPlay={(source) => {
                      sound.play(source);
                      setHeard((before) =>
                        before.indexOf(letter.letter) >= 0 ? before : [...before, letter.letter],
                      );
                    }}
                  />
                ) : null,
              )}
            </view>
          </view>
        ))}
      </view>
    </EntryBasicsFrame>
  );
}

function LetterCell({
  index,
  letter,
  source,
  heard,
  onPlay,
}: {
  readonly index: number;
  readonly letter: EntryBasicsLetter;
  readonly source: string | null;
  readonly heard: boolean;
  readonly onPlay: (source: string) => void;
}): ReactNode {
  const copy = useUiCopy().more.letters;
  const audio = source === null ? "unavailable" : heard ? "heard" : "ready";
  const suffix =
    audio === "unavailable" ? `, ${copy.soundUnavailable}` : heard ? `, ${copy.heard}` : "";
  const handleTap = () => {
    "background only";
    if (source !== null) onPlay(source);
  };
  return (
    <view
      className={
        source === null
          ? "entry-basics-cell"
          : `entry-basics-cell entry-basics-cell-playable${heard ? " entry-basics-cell-heard" : ""}`
      }
      data-testid={ids.letter(index)}
      accessibility-element={true}
      flatten={false}
      accessibility-label={`${letter.letter}, ${letter.roman}${suffix}`}
      accessibility-traits={source === null ? "none" : "button"}
      accessibility-enable-tap={source !== null}
      bindtap={handleTap}
    >
      <text className="tile-romanization entry-basics-cell-roman" accessibility-element={false}>
        {letter.roman}
      </text>
      <text
        className={
          letter.group === "vowels"
            ? "entry-basics-cell-glyph entry-basics-cell-vowel"
            : "entry-basics-cell-glyph"
        }
        accessibility-element={false}
      >
        {letter.letter}
      </text>
      <svg
        className="entry-basics-cell-speaker"
        data-testid={`${ids.letter(index)}-speaker`}
        data-audio={audio}
        content={volume}
        current-color={
          source === null ? color.fg.disabled : heard ? color.brand.strong : color.gray["700"]
        }
      />
    </view>
  );
}
