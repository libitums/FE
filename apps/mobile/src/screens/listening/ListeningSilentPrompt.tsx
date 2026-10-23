import type { ReactNode } from "@lynx-js/react";

import { AudioUnavailableControl } from "../../components/AudioUnavailableControl";
import { TextRoles } from "../../components/TextRoles";
import {
  koreanBrandToneOf,
  koreanTextStepOf,
  romanizationSizeFor,
} from "../../lib/korean-text-step";
import type { LearningDensity } from "../../lib/learning-density";
import { romanizationSegmentsOf } from "../../lib/romanization-segments";
import type { ListeningSilentPromptProps } from "./listening-silent-prompt.contract";

import "./listening-prompt.css";

// 소리가 없는 듣기 문항의 제시 채널입니다 — 대본을 늘 보이고 재생 조작은 꺼진 채 섭니다.
//
// `ListeningPrompt`에 boolean을 얹지 않고 따로 둔 이유: 저쪽은 재생 상태 · 대본 가림
// (`show-transcript`)을 아는 컴포넌트인데, 여기는 둘 다 해당이 없습니다. 소리가 없으면
// 대본이 유일한 단서라 가림 옵션과 무관하게 섭니다. 한글 · 로마자 모양은 같은 글 역할 부품을 씁니다.
// 재생 줄이 없으므로 구분선도 없습니다.
//
// DOM 순서 = 낭독 순서입니다: 대본이 먼저, 꺼진 조작이 뒤입니다.
export function ListeningSilentPrompt({
  text,
  romanization,
  density = "regular",
}: ListeningSilentPromptProps & { readonly density?: LearningDensity }): ReactNode {
  const step = koreanTextStepOf(text, density);

  return (
    <view className="listening-prompt" data-testid="listening-silent-prompt">
      <text
        className={`listening-prompt-text korean-text-${step} korean-text-tone-${koreanBrandToneOf(step)}`}
        data-testid="listening-silent-prompt-text"
      >
        {text}
      </text>
      <TextRoles.Romanization
        segments={romanizationSegmentsOf(romanization, undefined)}
        size={romanizationSizeFor(step)}
        testId="listening-silent-prompt-romanization"
      />
      <AudioUnavailableControl testId="listening-silent-prompt-audio" />
    </view>
  );
}
