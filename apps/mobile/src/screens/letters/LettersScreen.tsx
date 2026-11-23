import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import volume from "@libitums/icons/lynx/volume";
import { Button } from "@libitums/ui-lynx/button";

import { JAMO_GROUPS } from "../../lib/letters/jamo";
import type { JamoGroupId, JamoLetter } from "../../lib/letters/jamo";
import { useUiCopy } from "../../lib/ui-copy";
import { lettersTestIds as ids, type LettersScreenProps } from "./letters.contract";

import "./letters-screen.css";

// Letters(자모표) 화면입니다(ADR-0169, 시안 JamoChart · 선택 C). 더보기 메뉴에서 들어오는 more 스택 루트라 뒤로 단추가 없고 바텀
// 메뉴가 그대로 섭니다. 위(제목 · 리드 · 연습 단추)는 고정이고 아래 4열 격자 40칸만 스크롤합니다. 칸을 누르면 그 글자의 소리
// (자음 + ㅏ, ㅇ + 모음)가 나고 들은 칸은 스피커가 brand 색이 됩니다. 칸은 누르는 동안만 눌림 면이고 누른 뒤 켜진 채 남지 않으며,
// 진동하지 않습니다(⟨2026-11-21 개정⟩). 소리 파일이 아직 없으면(음성 정보 파일에 없음) 스피커가 비활성 모양이고 낭독 이름에 그
// 사실이 붙습니다 — 칸은 그대로 눌립니다(이벤트).
export function LettersScreen({
  romanization,
  sound,
  onPractice,
  onCellTapped,
}: LettersScreenProps): ReactNode {
  const copy = useUiCopy();
  const [heard, setHeard] = useState<readonly string[]>([]);

  const handlePractice = () => {
    "background only";
    onPractice();
  };

  let index = -1;
  return (
    <view className="letters-screen" data-testid={ids.screen}>
      <view className="letters-top">
        <text className="letters-title" accessibility-traits="header">
          {copy.more.letters.title}
        </text>
        <text className="letters-lead">{copy.more.letters.lead}</text>
        <view className="letters-practice" data-testid={ids.practice}>
          <Button
            label={copy.more.letters.practice}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={handlePractice}
          />
        </view>
      </view>
      <scroll-view
        className="letters-scroll"
        data-testid="letters-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="letters-list">
          {JAMO_GROUPS.map((group) => (
            <view key={group.id} className="letters-group">
              <text className="letters-group-title" accessibility-traits="header">
                {`${copy.more.letters.groups[group.id]} · ${group.letters.length}`}
              </text>
              <view className="letters-grid">
                {group.letters.map((letter) => {
                  index += 1;
                  return (
                    <LettersCell
                      key={letter.letter}
                      index={index}
                      letter={letter}
                      group={group.id}
                      source={sound.letterSourceOf(letter.letter)}
                      showRoman={romanization === "shown"}
                      heard={heard.indexOf(letter.letter) >= 0}
                      unavailableLabel={copy.more.letters.soundUnavailable}
                      heardLabel={copy.more.letters.heard}
                      onTap={(source) => {
                        if (source !== null) sound.play(source);
                        if (source !== null)
                          setHeard((prev) =>
                            prev.indexOf(letter.letter) >= 0 ? prev : [...prev, letter.letter],
                          );
                        onCellTapped?.(
                          letter.letter,
                          group.id,
                          source === null ? "unavailable" : "played",
                        );
                      }}
                    />
                  );
                })}
              </view>
            </view>
          ))}
        </view>
      </scroll-view>
    </view>
  );
}

type LettersCellProps = {
  readonly index: number;
  readonly letter: JamoLetter;
  readonly group: JamoGroupId;
  readonly source: string | null;
  readonly showRoman: boolean;
  readonly heard: boolean;
  readonly unavailableLabel: string;
  readonly heardLabel: string;
  readonly onTap: (source: string | null) => void;
};

function LettersCell({
  index,
  letter,
  group,
  source,
  showRoman,
  heard,
  unavailableLabel,
  heardLabel,
  onTap,
}: LettersCellProps): ReactNode {
  const handleTap = () => {
    "background only";
    onTap(source);
  };
  const vowel = group === "vowels" || group === "combined";
  const label = [
    letter.letter,
    letter.roman,
    source === null ? unavailableLabel : heard ? heardLabel : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
  const iconColor =
    source === null ? color.fg.disabled : heard ? color.brand.strong : color.gray["500"];
  return (
    <view
      className="letters-cell"
      data-testid={ids.cell(index)}
      data-heard={heard ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      flatten={false}
      bindtap={handleTap}
    >
      {showRoman ? (
        <text className="letters-cell-roman" accessibility-element={false}>
          {letter.roman}
        </text>
      ) : null}
      <text
        className={vowel ? "letters-cell-letter letters-cell-vowel" : "letters-cell-letter"}
        accessibility-element={false}
      >
        {letter.letter}
      </text>
      <svg
        className="letters-cell-speaker"
        data-testid={`${ids.cell(index)}-speaker`}
        data-audio={source === null ? "unavailable" : heard ? "heard" : "ready"}
        content={volume}
        current-color={iconColor}
      />
    </view>
  );
}
