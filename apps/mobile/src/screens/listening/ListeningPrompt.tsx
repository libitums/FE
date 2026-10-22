import type { ReactNode } from "@lynx-js/react";

import { ListenPlaybackRow } from "../../components/ListenPlaybackControls";
import { TextRoles } from "../../components/TextRoles";
import type { ListenAudioControl } from "../../components/use-listen-audio";
import {
  koreanBrandToneOf,
  koreanTextStepOf,
  romanizationSizeFor,
} from "../../lib/korean-text-step";
import type { LearningDensity } from "../../lib/learning-density";
import { romanizationSegmentsOf } from "../../lib/romanization-segments";
import type { SessionOptions } from "../../lib/session-options";
import { listeningScriptOf } from "./listening-script";
import type { ListeningBeforeAnswer } from "./listening-questions";

import "./listening-prompt.css";

// 이 컴포넌트는 문항의 **제시 채널**이고, 제시 방식이 바뀌면 통째로 교체되는 자리입니다.
//
// 카드 안이 위에서 아래로 재생 줄 → 구분선 → (답한 뒤) 한글 → 로마자입니다. 답하기 전에 무엇이 서는가는 문항이
// 정한 `beforeAnswer`가 가르고(소리 구별 문항은 아무것도, 듣고 고르기는 로마자만), 답한 뒤나 대본을 켜 둔 세션에서는
// 한글 + 로마자가 섭니다 — 한글 대본은 어느 갈래에서도 답하기 전에 가려집니다.
//
// **이 컴포넌트는 표시만 합니다.** 재생 상태 · 자동 재생 · 조작은 화면의 `useListenAudio`가 주인이고(학습 껍데기가
// 배치를 바꿀 때 무대 내용을 다시 세워도 소리가 끊기지 않게 하려는 것입니다), 여기에는 `playback` 묶음 하나로
// 내려옵니다. `NativeModules`도 직접 만지지 않습니다(ADR-0017 D3) — 접점은 `lib/audio.ts` 하나입니다.
//
// **`<audio>`·`<video>`를 렌더하지 않습니다.** 판정 환경(Pod 4.0.1)에 미등록이라 렌더하면 페이지 전체가 죽습니다 —
// 소리는 네이티브 모듈이 냅니다.

export type ListeningPromptProps = {
  text: string;
  romanization: string;
  /** 대본을 보일지(`show-transcript`)만 읽습니다. */
  sessionOptions: SessionOptions;
  /** 판정이 나서 대본을 열어 보일 때 true — 설정이 꺼져 있어도 대본이 섭니다. */
  revealed: boolean;
  /** 재생 상태와 조작을 묶어 받습니다 — 주인은 화면의 `useListenAudio`입니다. */
  playback: ListenAudioControl;
  /** 답하기 전 대본 자리에 무엇을 세우는가입니다. */
  beforeAnswer: ListeningBeforeAnswer;
  /** 문항의 밀도입니다(한글 글자 단계와 카드 여백이 갈립니다). */
  density: LearningDensity;
};

export function ListeningPrompt({
  text,
  romanization,
  sessionOptions,
  revealed,
  playback,
  beforeAnswer,
  density,
}: ListeningPromptProps): ReactNode {
  const script = listeningScriptOf({
    beforeAnswer,
    showTranscript: sessionOptions["show-transcript"],
    revealed,
  });
  const step = koreanTextStepOf(text, density);

  return (
    <view className="listening-prompt">
      {/* **DOM 순서 = 낭독 순서입니다.** 재생 줄이 먼저, 구분선(낭독 제외) 아래 한글 · 로마자가 뒤입니다.
          **대본은 CSS로 숨기지 않고 렌더를 거릅니다.** jsdom은 스타일을 계산하지 않아 `display:none`은 ui 계층이
          원리적으로 못 보고, 숨긴 `<text>`는 보조기술 정지점으로 남습니다. 로마자 줄도 같은 가림을 받습니다 —
          정답 노출 방지(소리 구별 문항)가 그 줄에 걸려 있습니다. */}
      <ListenPlaybackRow control={playback} testIdPrefix="listening-prompt" />
      {script === "none" ? null : <TextRoles.Divider testId="listening-prompt-divider" />}
      {script === "full" ? (
        <text
          className={`listening-prompt-text korean-text-${step} korean-text-tone-${koreanBrandToneOf(step)}`}
          data-testid="listening-prompt-text"
        >
          {text}
        </text>
      ) : null}
      {script === "none" ? null : (
        <TextRoles.Romanization
          segments={romanizationSegmentsOf(romanization, undefined)}
          size={romanizationSizeFor(step)}
          testId="listening-prompt-romanization"
        />
      )}
    </view>
  );
}
